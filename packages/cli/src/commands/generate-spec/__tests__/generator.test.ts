import { inferMultipartSchema, inferSchema, mergeSchemas, templatizePath } from '../generator.js';

describe('templatizePath', () => {
  it('replaces identifier-like segments with parameters named after the parent segment', () => {
    expect(templatizePath('/users/42/posts/7')).toEqual({
      template: '/users/{userId}/posts/{postId}',
      params: [
        { name: 'userId', value: '42' },
        { name: 'postId', value: '7' },
      ],
    });
  });

  it('recognizes UUID, ULID, cuid and prefixed identifiers', () => {
    expect(templatizePath('/items/f47ac10b-58cc-4372-a567-0e02b2c3d479').template).toBe(
      '/items/{itemId}'
    );
    expect(templatizePath('/orders/01ARZ3NDEKTSV4RRFFQ69G5FAV').template).toBe('/orders/{orderId}');
    expect(templatizePath('/orgs/org_01ks7rnqsyy0g6h37rfmen7zv9').template).toBe('/orgs/{orgId}');
    expect(templatizePath('/orders/cjld2cjxh0000qzrmn831i7rn').template).toBe('/orders/{orderId}');
    expect(templatizePath('/orders/tz4a98xxat96iws9zmbrgj3a').template).toBe('/orders/{orderId}');
  });

  it('keeps long plain words that contain no digits', () => {
    expect(templatizePath('/categories/internationalizations').template).toBe(
      '/categories/internationalizations'
    );
  });

  it('deduplicates parameter names within a path', () => {
    expect(templatizePath('/orgs/1/orgs/2').template).toBe('/orgs/{orgId}/orgs/{orgId2}');
  });

  it('names a parameter with no parent segment "id" and keeps plain segments', () => {
    expect(templatizePath('/f47ac10b-58cc-4372-a567-0e02b2c3d479').template).toBe('/{id}');
    expect(templatizePath('/users/profile').template).toBe('/users/profile');
  });
});

describe('inferMultipartSchema', () => {
  it('parses form fields and file parts into an object schema', () => {
    const body = [
      '--demo-boundary',
      'Content-Disposition: form-data; name="name"',
      '',
      'espresso-doppio',
      '--demo-boundary',
      'Content-Disposition: form-data; name="price"',
      '',
      '300',
      '--demo-boundary',
      'Content-Disposition: form-data; name="photo"; filename="cup.png"',
      'Content-Type: image/png',
      '',
      'PNGDATA',
      '--demo-boundary--',
      '',
    ].join('\r\n');

    expect(inferMultipartSchema(body, 'multipart/form-data; boundary=demo-boundary')).toEqual({
      type: 'object',
      properties: {
        name: { type: 'string' },
        price: { type: 'string' },
        photo: { type: 'string', format: 'binary' },
      },
      required: ['name', 'price', 'photo'],
    });
  });
});

describe('inferSchema', () => {
  it('infers primitive types', () => {
    expect(inferSchema('x')).toEqual({ type: 'string' });
    expect(inferSchema(3)).toEqual({ type: 'integer' });
    expect(inferSchema(3.5)).toEqual({ type: 'number' });
    expect(inferSchema(true)).toEqual({ type: 'boolean' });
    expect(inferSchema(null)).toEqual({ type: 'null' });
  });

  it('infers objects with all observed properties required', () => {
    expect(inferSchema({ a: 1, b: 'x' })).toEqual({
      type: 'object',
      properties: { a: { type: 'integer' }, b: { type: 'string' } },
      required: ['a', 'b'],
    });
  });

  it('merges array item samples', () => {
    expect(inferSchema([1, 2.5])).toEqual({ type: 'array', items: { type: 'number' } });
    expect(inferSchema([])).toEqual({ type: 'array' });
  });

  it('describes arrays of alternative shapes with oneOf items', () => {
    expect(inferSchema([{ a: 1 }, { b: 'x' }])).toEqual({
      type: 'array',
      items: {
        oneOf: [
          { type: 'object', properties: { a: { type: 'integer' } }, required: ['a'] },
          { type: 'object', properties: { b: { type: 'string' } }, required: ['b'] },
        ],
      },
    });
  });

  it('describes identifier-keyed objects as maps', () => {
    expect(inferSchema({ '1': 'a', '2': 'b' })).toEqual({
      type: 'object',
      additionalProperties: { type: 'string' },
    });
  });
});

describe('mergeSchemas', () => {
  const card = inferSchema({ type: 'card', amount: 100, cardNumber: '41', cvv: '123' });
  const bank = inferSchema({ type: 'bank_transfer', amount: 75, iban: 'DE89' });

  it('widens integer and number to number', () => {
    expect(mergeSchemas([{ type: 'integer' }, { type: 'number' }])).toEqual({ type: 'number' });
  });

  it('folds null observations into a type union', () => {
    expect(mergeSchemas([{ type: 'string' }, { type: 'null' }])).toEqual({
      type: ['string', 'null'],
    });
    expect(mergeSchemas([inferSchema({ a: 1 }), { type: 'null' }])).toEqual({
      type: ['object', 'null'],
      properties: { a: { type: 'integer' } },
      required: ['a'],
    });
  });

  it('merges similar object shapes and relaxes required to the intersection', () => {
    expect(
      mergeSchemas([inferSchema({ a: 1, b: 'x', c: true }), inferSchema({ a: 2, b: 'y' })])
    ).toEqual({
      type: 'object',
      properties: { a: { type: 'integer' }, b: { type: 'string' }, c: { type: 'boolean' } },
      required: ['a', 'b'],
    });
  });

  it('keeps dissimilar object shapes as oneOf variants', () => {
    const merged = mergeSchemas([card, bank]);
    expect(merged.oneOf).toHaveLength(2);
    expect(merged.oneOf?.[0].properties).toHaveProperty('cardNumber');
    expect(merged.oneOf?.[1].properties).toHaveProperty('iban');
  });

  it('clusters later samples into the matching variant', () => {
    const cardWithReceipt = inferSchema({
      type: 'card',
      amount: 250.5,
      cardNumber: '55',
      cvv: '999',
      receiptEmail: 'a@b.c',
    });
    const merged = mergeSchemas([card, bank, cardWithReceipt]);
    expect(merged.oneOf).toHaveLength(2);
    const [mergedCard] = merged.oneOf ?? [];
    expect(mergedCard.properties).toHaveProperty('receiptEmail');
    expect(mergedCard.properties?.amount).toEqual({ type: 'number' });
    expect(mergedCard.required).not.toContain('receiptEmail');
  });

  it('retains information observed after a divergent sample', () => {
    const merged = mergeSchemas([
      inferSchema({ a: 1 }),
      { type: 'string' },
      inferSchema({ a: 1, b: 'x' }),
    ]);
    expect(merged.oneOf).toEqual([
      {
        type: 'object',
        properties: { a: { type: 'integer' }, b: { type: 'string' } },
        required: ['a'],
      },
      { type: 'string' },
    ]);
  });

  it('merges maps with maps but keeps maps and records as separate variants', () => {
    const map = inferSchema({ '1': 1, '2': 2 });
    expect(mergeSchemas([map, inferSchema({ '3': 2.5 })])).toEqual({
      type: 'object',
      additionalProperties: { type: 'number' },
    });
    expect(mergeSchemas([map, inferSchema({ name: 'x' })]).oneOf).toHaveLength(2);
  });

  it('caps the number of object variants by folding the most similar ones', () => {
    const disjoint = [
      inferSchema({ a1: 1, a2: 1 }),
      inferSchema({ b1: 1, b2: 1 }),
      inferSchema({ c1: 1, c2: 1 }),
      inferSchema({ d1: 1, d2: 1 }),
      inferSchema({ e1: 1, e2: 1 }),
    ];
    const merged = mergeSchemas(disjoint);
    expect(merged.oneOf).toHaveLength(3);
  });
});
