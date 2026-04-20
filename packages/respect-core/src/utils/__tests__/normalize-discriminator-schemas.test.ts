import { normalizeDiscriminatorSchemas } from '../normalize-discriminator-schemas.js';

describe('normalizeDiscriminatorSchemas', () => {
  it('should return schema unchanged when no discriminator is present', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    };

    const result = normalizeDiscriminatorSchemas(schema);
    expect(result).toEqual(schema);
  });

  it('should return schema unchanged when discriminator property already has const', () => {
    const schema = {
      oneOf: [
        {
          type: 'object',
          properties: {
            method: { const: 'cash' },
          },
        },
      ],
      discriminator: { propertyName: 'method' },
    };

    const result = normalizeDiscriminatorSchemas(schema);
    expect(result.oneOf[0].properties.method).toEqual({ const: 'cash' });
  });

  it('should return schema unchanged when discriminator property already has enum', () => {
    const schema = {
      oneOf: [
        {
          type: 'object',
          properties: {
            method: { enum: ['cash', 'card'] },
          },
        },
      ],
      discriminator: { propertyName: 'method' },
    };

    const result = normalizeDiscriminatorSchemas(schema);
    expect(result.oneOf[0].properties.method).toEqual({ enum: ['cash', 'card'] });
  });

  it('should promote enum from allOf to top level of discriminator property', () => {
    const schema = {
      oneOf: [
        {
          type: 'object',
          properties: {
            method: {
              allOf: [
                { enum: ['cash', 'payment-card', 'paypal'] },
                { not: { enum: ['payment-card', 'paypal'] } },
              ],
            },
          },
        },
      ],
      discriminator: { propertyName: 'method' },
    };

    const result = normalizeDiscriminatorSchemas(schema) as any;

    expect(result.oneOf[0].properties.method.enum).toEqual(['cash', 'payment-card', 'paypal']);
    expect(result.oneOf[0].properties.method.allOf).toEqual([
      { enum: ['cash', 'payment-card', 'paypal'] },
      { not: { enum: ['payment-card', 'paypal'] } },
    ]);
  });

  it('should promote const from allOf to top level of discriminator property', () => {
    const schema = {
      oneOf: [
        {
          type: 'object',
          properties: {
            type: {
              allOf: [{ const: 'dog' }, { description: 'Animal type' }],
            },
          },
        },
      ],
      discriminator: { propertyName: 'type' },
    };

    const result = normalizeDiscriminatorSchemas(schema) as any;

    expect(result.oneOf[0].properties.type.const).toBe('dog');
    expect(result.oneOf[0].properties.type.allOf).toBeDefined();
  });

  it('should handle anyOf in addition to oneOf', () => {
    const schema = {
      anyOf: [
        {
          type: 'object',
          properties: {
            kind: {
              allOf: [{ enum: ['cat', 'dog'] }],
            },
          },
        },
      ],
      discriminator: { propertyName: 'kind' },
    };

    const result = normalizeDiscriminatorSchemas(schema) as any;

    expect(result.anyOf[0].properties.kind.enum).toEqual(['cat', 'dog']);
  });

  it('should handle nested discriminators', () => {
    const schema = {
      type: 'object',
      properties: {
        payment: {
          oneOf: [
            {
              type: 'object',
              properties: {
                method: {
                  allOf: [{ enum: ['cash'] }],
                },
              },
            },
          ],
          discriminator: { propertyName: 'method' },
        },
      },
    };

    const result = normalizeDiscriminatorSchemas(schema) as any;

    expect(result.properties.payment.oneOf[0].properties.method.enum).toEqual(['cash']);
  });

  it('should not mutate the original schema', () => {
    const schema = {
      oneOf: [
        {
          type: 'object',
          properties: {
            method: {
              allOf: [{ enum: ['cash'] }],
            },
          },
        },
      ],
      discriminator: { propertyName: 'method' },
    };

    normalizeDiscriminatorSchemas(schema);

    expect((schema.oneOf[0].properties.method as any).enum).toBeUndefined();
    expect(schema.oneOf[0].properties.method.allOf).toBeDefined();
  });

  it('should handle null and non-object values gracefully', () => {
    expect(normalizeDiscriminatorSchemas(null)).toBeNull();
    expect(normalizeDiscriminatorSchemas(undefined)).toBeUndefined();
    expect(normalizeDiscriminatorSchemas('string')).toBe('string');
    expect(normalizeDiscriminatorSchemas(42)).toBe(42);
  });

  it('should handle multiple variants with mixed patterns', () => {
    const schema = {
      oneOf: [
        {
          type: 'object',
          properties: {
            method: {
              allOf: [{ enum: ['cash', 'check'] }, { not: { enum: ['check'] } }],
            },
          },
        },
        {
          type: 'object',
          properties: {
            method: { const: 'payment-card' },
          },
        },
      ],
      discriminator: { propertyName: 'method' },
    };

    const result = normalizeDiscriminatorSchemas(schema) as any;

    expect(result.oneOf[0].properties.method.enum).toEqual(['cash', 'check']);
    expect(result.oneOf[0].properties.method.allOf).toBeDefined();

    expect(result.oneOf[1].properties.method).toEqual({ const: 'payment-card' });
  });

  it('should handle variant without the discriminator property', () => {
    const schema = {
      oneOf: [
        {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        },
        {
          type: 'object',
          properties: {
            method: { const: 'cash' },
          },
        },
      ],
      discriminator: { propertyName: 'method' },
    };

    const result = normalizeDiscriminatorSchemas(schema);

    expect(result.oneOf[0].properties.method).toBeUndefined();
    expect(result.oneOf[1].properties.method).toEqual({ const: 'cash' });
  });

  it('should preserve existing properties on discriminator schema when promoting const/enum', () => {
    const schema = {
      oneOf: [
        {
          type: 'object',
          properties: {
            method: {
              type: 'string',
              description: 'Payment method type',
              nullable: true,
              allOf: [{ enum: ['cash', 'card'] }],
            },
          },
        },
      ],
      discriminator: { propertyName: 'method' },
    };

    const result = normalizeDiscriminatorSchemas(schema) as any;

    expect(result.oneOf[0].properties.method.enum).toEqual(['cash', 'card']);
    expect(result.oneOf[0].properties.method.type).toBe('string');
    expect(result.oneOf[0].properties.method.description).toBe('Payment method type');
    expect(result.oneOf[0].properties.method.nullable).toBe(true);
    expect(result.oneOf[0].properties.method.allOf).toBeDefined();
  });
});
