import { logger } from '@redocly/openapi-core';

import type { StepCallContext, TestContext } from '../../../../types.js';
import { cleanColors } from '../../../../utils/clean-colors.js';
import { DEFAULT_SEVERITY_CONFIGURATION } from '../../../checks/severity.js';
import { CHECKS, checkSchema, statusCodeDiff } from '../../../flow-runner/index.js';

describe('checkSchema', () => {
  const stepCallCtx = {
    $request: {
      header: {},
      path: '/breeds',
      url: 'https://catfact.ninja/',
      method: 'get',
      queryParams: {},
      pathParams: {},
      headerParams: {},
    },
    $response: {
      body: {
        current_page: 1,
        data: [
          {
            breed: 'Abyssinian',
            country: 'Ethiopia',
            origin: 'Natural/Standard',
            coat: 'Short',
            pattern: 'Ticked',
          },
          {
            breed: 'Asian',
            country: 'developed in the United Kingdom (founding stock from Asia)',
            origin: '',
            coat: 'Short',
            pattern: 'Evenly solid',
          },
        ],
        first_page_url: 'https://catfact.ninja/breeds?page=1',
        from: 1,
        last_page: 4,
        last_page_url: 'https://catfact.ninja/breeds?page=4',
        links: [
          {
            url: null,
            label: 'Previous',
            active: false,
          },
          {
            url: 'https://catfact.ninja/breeds?page=1',
            label: '1',
            active: true,
          },
        ],
        next_page_url: 'https://catfact.ninja/breeds?page=2',
        path: 'https://catfact.ninja/breeds',
        per_page: 25,
        prev_page_url: null,
        to: 25,
        total: 98,
      },
      statusCode: 200,
      header: { 'content-type': 'application/json' },
      contentType: 'application/json',
    },
    $outputs: {},
  } as unknown as StepCallContext;

  const descriptionOperation = {
    tags: ['Breeds'],
    summary: 'Get a list of breeds',
    description: 'Returns a a list of breeds',
    operationId: 'getBreeds',
    parameters: [
      {
        name: 'limit',
        in: 'query',
        description: 'limit the amount of results returned',
        required: false,
        schema: {
          type: 'integer',
          format: 'int64',
        },
      },
    ],
    responses: {
      '200': {
        description: 'successful operation',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                title: 'Breed model',
                description: 'Breed',
                properties: {
                  breed: {
                    title: 'Breed',
                    description: 'Breed',
                    type: 'string',
                    format: 'string',
                  },
                  country: {
                    title: 'Country',
                    description: 'Country',
                    type: 'string',
                    format: 'string',
                  },
                  origin: {
                    title: 'Origin',
                    description: 'Origin',
                    type: 'string',
                    format: 'string',
                  },
                  coat: {
                    title: 'Coat',
                    description: 'Coat',
                    type: 'string',
                    format: 'string',
                  },
                  pattern: {
                    title: 'Pattern',
                    description: 'Pattern',
                    type: 'string',
                    format: 'string',
                  },
                },
                type: 'object',
              },
            },
          },
        },
      },
    },
    path: '/breeds',
    method: 'get',
    descriptionName: 'cats',
  };

  const ctx = {
    severity: DEFAULT_SEVERITY_CONFIGURATION,
    options: {
      logger,
    },
  } as unknown as TestContext;

  it('should check expectation from test case description', () => {
    const result = checkSchema({
      stepCallCtx,
      descriptionOperation,
      ctx,
      ajvContext: { apiContext: 'response' },
    });
    expect(result).toEqual([
      {
        condition: '$statusCode in [200]',
        message: expect.stringContaining(
          'List of valid response codes are inferred from description'
        ),
        name: CHECKS.STATUS_CODE_CHECK,
        passed: true,
        severity: 'error',
      },
      {
        message: 'Content type "application/json" is described in the schema.',
        name: CHECKS.CONTENT_TYPE_CHECK,
        passed: true,
        severity: 'error',
      },
      {
        message: expect.stringMatching(/TYPE[\s\S]*must be array/i),
        name: CHECKS.SCHEMA_CHECK,
        passed: false,
        severity: 'error',
      },
    ]);
  });

  it('should check status code and schema from description', () => {
    const result = checkSchema({
      stepCallCtx,
      descriptionOperation,
      ctx,
    });

    expect(result).toEqual([
      {
        condition: '$statusCode in [200]',
        message: expect.stringContaining('200'),
        name: CHECKS.STATUS_CODE_CHECK,
        passed: true,
        severity: 'error',
      },
      {
        message: 'Content type "application/json" is described in the schema.',
        name: CHECKS.CONTENT_TYPE_CHECK,
        passed: true,
        severity: 'error',
      },
      {
        message: expect.stringMatching(/TYPE[\s\S]*must be array/i),
        name: CHECKS.SCHEMA_CHECK,
        passed: false,
        severity: 'error',
      },
    ]);
  });

  it('should check ajv errors', () => {
    const result = checkSchema({
      stepCallCtx: {
        $request: {
          header: {},
          path: '/breeds',
          url: 'https://catfact.ninja/',
          method: 'get',
          queryParams: {},
          pathParams: {},
          headerParams: {},
        },
        $response: {
          body: [
            {
              breed: 'Abyssinian',
              country: 'Ethiopia',
              origin: 'Natural/Standard',
              coat: 'Short',
              pattern: 'Ticked',
            },
            {
              breed: 'Asian',
              country: 'developed in the United Kingdom (founding stock from Asia)',
              origin: '',
              coat: 'Short',
              pattern: 'Evenly solid',
            },
          ],
          statusCode: 200,
          header: new Headers({ 'content-type': 'application/json' }),
          contentType: 'application/json',
        },
        $outputs: {},
      } as unknown as StepCallContext,
      descriptionOperation,
      ctx,
    });

    expect(result).toEqual([
      {
        condition: '$statusCode in [200]',
        message: expect.stringContaining('200'),
        name: CHECKS.STATUS_CODE_CHECK,
        passed: true,
        severity: 'error',
      },
      {
        message: 'Content type "application/json" is described in the schema.',
        name: CHECKS.CONTENT_TYPE_CHECK,
        passed: true,
        severity: 'error',
      },
      {
        message: '',
        name: CHECKS.SCHEMA_CHECK,
        passed: true,
        severity: 'error',
      },
    ]);
  });

  function checkResponseSchema(schema: unknown, body: unknown) {
    const result = checkSchema({
      stepCallCtx: {
        $response: {
          body,
          statusCode: 200,
          header: { 'content-type': 'application/json' },
          contentType: 'application/json',
        },
      } as unknown as StepCallContext,
      descriptionOperation: {
        responses: {
          '200': {
            description: 'Successful operation.',
            content: { 'application/json': { schema } },
          },
        },
      },
      ctx,
    });

    return result.find(({ name }) => name === CHECKS.SCHEMA_CHECK);
  }

  it('should check a response against a recursive schema', () => {
    // A dereferenced `$ref` is a copy of its target, so the copy shares `properties` with the target.
    const properties = {
      title: { type: 'string' },
      cause: {},
    };
    const problem = { type: 'object', required: ['title'], properties };
    properties.cause = { ...problem };

    const schemaCheck = checkResponseSchema(problem, {
      title: 'Invalid order',
      cause: { title: 'Invalid item', cause: { title: 404 } },
    });

    expect(schemaCheck?.passed).toBe(false);
    expect(cleanColors(schemaCheck?.message ?? '')).toMatchInlineSnapshot(`
      "
      TYPE must be string

        4 |     "title": "Invalid item",
        5 |     "cause": {
      > 6 |       "title": 404
          |                ^^^ 👈🏽  type must be string
        7 |     }
        8 |   }
        9 | }
      "
    `);
  });

  it('should check a response against a recursive schema with a discriminator', () => {
    // The `MenuSection` variant holds the discriminator property in `allOf` and contains its copy.
    const menuSectionParts: unknown[] = [];
    const menuSection = { allOf: menuSectionParts };
    menuSectionParts.push({
      type: 'object',
      required: ['kind'],
      properties: {
        kind: { type: 'string', enum: ['section'] },
        entries: { type: 'array', items: { ...menuSection } },
      },
    });
    const menuEntry = {
      discriminator: { propertyName: 'kind' },
      oneOf: [
        { ...menuSection },
        {
          type: 'object',
          required: ['kind'],
          properties: { kind: { type: 'string', enum: ['item'] } },
        },
      ],
    };

    const schemaCheck = checkResponseSchema(menuEntry, {
      kind: 'section',
      entries: [{ kind: 'section', entries: [{ kind: 'section', entries: 'none' }] }],
    });

    expect(schemaCheck?.passed).toBe(false);
    expect(cleanColors(schemaCheck?.message ?? '')).toMatchInlineSnapshot(`
      "
      TYPE must be array

         7 |         {
         8 |           "kind": "section",
      >  9 |           "entries": "none"
           |                      ^^^^^^ 👈🏽  type must be array
        10 |         }
        11 |       ]
        12 |     }
      "
    `);
  });

  it('should check a response against a schema with a recursive extension', () => {
    const menuItem: Record<string, unknown> = {
      type: 'object',
      properties: { name: { type: 'string' } },
    };
    menuItem['x-related'] = menuItem;

    const schemaCheck = checkResponseSchema(menuItem, { name: 42 });

    expect(schemaCheck?.passed).toBe(false);
    expect(cleanColors(schemaCheck?.message ?? '')).toMatchInlineSnapshot(`
      "
      TYPE must be string

        1 | {
      > 2 |   "name": 42
          |           ^^ 👈🏽  type must be string
        3 | }
      "
    `);
  });

  it('should check a response against nested discriminators with many values', () => {
    const methods = Array.from({ length: 150 }, (_, index) => `method-${index}`);
    const backupInstrument = {
      discriminator: { propertyName: 'method' },
      anyOf: [
        {
          type: 'object',
          required: ['method'],
          properties: { method: { type: 'string', enum: methods }, id: { type: 'string' } },
        },
      ],
    };
    const paymentInstrument = {
      discriminator: { propertyName: 'method' },
      anyOf: [
        {
          type: 'object',
          required: ['method'],
          properties: { method: { type: 'string', enum: methods }, backup: backupInstrument },
        },
      ],
    };

    const schemaCheck = checkResponseSchema(paymentInstrument, {
      method: 'method-7',
      backup: { method: 'method-3', id: 'instrument-1' },
    });

    expect(schemaCheck).toEqual({
      message: '',
      name: CHECKS.SCHEMA_CHECK,
      passed: true,
      severity: 'error',
    });
  });

  it('should not report an undeclared property of a discriminator variant under anyOf', () => {
    // Ajv reports an undeclared property under `anyOf` only when the schema is referenced,
    // so a variant with several values stays inlined there.
    const variants = [
      {
        type: 'object',
        required: ['category'],
        properties: {
          category: { type: 'string', enum: ['beverage', 'dessert'] },
          name: { type: 'string' },
        },
      },
    ];
    const menuItem = { discriminator: { propertyName: 'category' }, oneOf: variants };
    const order = {
      type: 'object',
      properties: {
        item: { ...menuItem },
        alternative: { anyOf: [{ ...menuItem }, { type: 'null' }] },
      },
    };

    const schemaCheck = checkResponseSchema(order, {
      item: { category: 'beverage', name: 'Espresso' },
      alternative: { category: 'dessert', name: 'Tiramisu', size: 'small' },
    });

    expect(schemaCheck?.passed).toBe(true);
  });

  it('should check a response against a schema with a discriminator and no oneOf', () => {
    // The parent schema of the `allOf` form of a discriminator.
    const menuBaseItem = {
      type: 'object',
      required: ['category', 'name'],
      discriminator: { propertyName: 'category' },
      properties: { category: { type: 'string' }, name: { type: 'string' } },
    };
    const beverage = {
      allOf: [menuBaseItem, { type: 'object', properties: { volume: { type: 'integer' } } }],
    };

    const schemaCheck = checkResponseSchema(beverage, {
      category: 'beverage',
      name: 'Espresso',
      volume: 'small',
    });

    expect(schemaCheck?.passed).toBe(false);
    expect(cleanColors(schemaCheck?.message ?? '')).toMatchInlineSnapshot(`
      "
      TYPE must be integer

        2 |   "category": "beverage",
        3 |   "name": "Espresso",
      > 4 |   "volume": "small"
          |             ^^^^^^^ 👈🏽  type must be integer
        5 | }
      "
    `);
  });

  it('should catch ajvStrict.compile error', () => {
    // oxlint-disable-next-line typescript/no-require-imports
    vi.spyOn(require('@redocly/ajv/dist/2020').prototype, 'compile').mockImplementationOnce(() => {
      throw new Error('ajvStrict.compile error');
    });

    const result = checkSchema({
      stepCallCtx: {
        $request: {
          header: {},
          path: '/breeds',
          url: 'https://catfact.ninja/',
          method: 'get',
          queryParams: {},
          pathParams: {},
          headerParams: {},
        },
        $response: {
          body: [
            {
              breed: 'Abyssinian',
              country: 'Ethiopia',
              origin: 'Natural/Standard',
              coat: 'Short',
              pattern: 'Ticked',
            },
            {
              breed: 'Asian',
              country: 'developed in the United Kingdom (founding stock from Asia)',
              origin: '',
              coat: 'Short',
              pattern: 'Evenly solid',
            },
          ],
          statusCode: 200,
          header: new Headers({ 'content-type': 'application/json' }),
          contentType: 'application/json',
        },
        $outputs: {},
      } as unknown as StepCallContext,
      descriptionOperation,
      ctx,
      ajvContext: { apiContext: 'response' },
    });

    expect(result).toEqual([
      {
        condition: '$statusCode in [200]',
        message: expect.stringContaining(
          'List of valid response codes are inferred from description'
        ),
        name: CHECKS.STATUS_CODE_CHECK,
        passed: true,
        severity: 'error',
      },
      {
        message: 'Content type "application/json" is described in the schema.',
        name: CHECKS.CONTENT_TYPE_CHECK,
        passed: true,
        severity: 'error',
      },
      {
        message: 'Ajv error: ajvStrict.compile error',
        name: CHECKS.SCHEMA_CHECK,
        passed: false,
        severity: 'error',
      },
    ]);
  });

  describe('writeOnly handling via ajvContext', () => {
    const writeOnlyDescriptionOperation = {
      ...descriptionOperation,
      responses: {
        '200': {
          description: 'successful operation',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['id', 'password'],
                properties: {
                  id: { type: 'string' },
                  password: { type: 'string', writeOnly: true },
                },
              },
            },
          },
        },
      },
    };

    // response omits the writeOnly `password` property
    const stepCallCtxWithoutWriteOnly = {
      $request: {
        header: {},
        path: '/breeds',
        url: 'https://catfact.ninja/',
        method: 'get',
        queryParams: {},
        pathParams: {},
        headerParams: {},
      },
      $response: {
        body: { id: 'abc' },
        statusCode: 200,
        header: new Headers({ 'content-type': 'application/json' }),
        contentType: 'application/json',
      },
      $outputs: {},
    } as unknown as StepCallContext;

    it('skips writeOnly required property when ajvContext marks a response', () => {
      const result = checkSchema({
        stepCallCtx: stepCallCtxWithoutWriteOnly,
        descriptionOperation: writeOnlyDescriptionOperation,
        ctx,
        ajvContext: { apiContext: 'response' },
      });

      const schemaCheck = result.find((c) => c.name === CHECKS.SCHEMA_CHECK);
      expect(schemaCheck?.passed).toBe(true);
      expect(schemaCheck?.message).toBe('');
    });

    it('skips a required property that is writeOnly through allOf', () => {
      const responseSchema =
        writeOnlyDescriptionOperation.responses['200'].content['application/json'].schema;
      const writeOnlyThroughAllOfOperation = {
        ...descriptionOperation,
        responses: {
          '200': {
            description: 'successful operation',
            content: {
              'application/json': {
                schema: {
                  ...responseSchema,
                  properties: {
                    ...responseSchema.properties,
                    password: { allOf: [{ type: 'string' }, { writeOnly: true }] },
                  },
                },
              },
            },
          },
        },
      };

      const result = checkSchema({
        stepCallCtx: stepCallCtxWithoutWriteOnly,
        descriptionOperation: writeOnlyThroughAllOfOperation,
        ctx,
        ajvContext: { apiContext: 'response' },
      });

      const schemaCheck = result.find((c) => c.name === CHECKS.SCHEMA_CHECK);
      expect(schemaCheck?.passed).toBe(true);
      expect(schemaCheck?.message).toBe('');
    });

    it('enforces writeOnly required property when no ajvContext is provided', () => {
      const result = checkSchema({
        stepCallCtx: stepCallCtxWithoutWriteOnly,
        descriptionOperation: writeOnlyDescriptionOperation,
        ctx,
      });

      const schemaCheck = result.find((c) => c.name === CHECKS.SCHEMA_CHECK);
      expect(schemaCheck?.passed).toBe(false);
      expect(cleanColors(schemaCheck?.message ?? '')).toContain('password');
    });
  });

  describe('decimal multipleOf', () => {
    const multipleOfDescriptionOperation = {
      ...descriptionOperation,
      responses: {
        '200': {
          description: 'successful operation',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { percent: { type: 'number', multipleOf: 0.1 } },
              },
            },
          },
        },
      },
    };

    const checkPercent = (percent: number) =>
      checkSchema({
        stepCallCtx: {
          ...stepCallCtx,
          $response: {
            body: { percent },
            statusCode: 200,
            header: new Headers({ 'content-type': 'application/json' }),
            contentType: 'application/json',
          },
        } as unknown as StepCallContext,
        descriptionOperation: multipleOfDescriptionOperation,
        ctx,
      }).find((c) => c.name === CHECKS.SCHEMA_CHECK);

    it('accepts a decimal value that is a multiple of a decimal multipleOf', () => {
      expect(checkPercent(98.8)?.passed).toBe(true);
    });

    it('still reports a decimal value that is not a multiple', () => {
      expect(checkPercent(98.85)?.passed).toBe(false);
    });
  });

  describe('format validation', () => {
    const formatDescriptionOperation = {
      ...descriptionOperation,
      responses: {
        '200': {
          description: 'successful operation',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  createdAt: { type: 'string', format: 'date-time' },
                  email: { type: 'string', format: 'email' },
                  count: { type: 'integer', format: 'int32' },
                },
              },
            },
          },
        },
      },
    };

    const checkBody = (body: Record<string, unknown>) =>
      checkSchema({
        stepCallCtx: {
          ...stepCallCtx,
          $response: {
            body,
            statusCode: 200,
            header: new Headers({ 'content-type': 'application/json' }),
            contentType: 'application/json',
          },
        } as unknown as StepCallContext,
        descriptionOperation: formatDescriptionOperation,
        ctx,
      }).find((c) => c.name === CHECKS.SCHEMA_CHECK);

    it('accepts values that match their format', () => {
      expect(
        checkBody({ createdAt: '2026-11-20T10:00:00Z', email: 'ada@example.com', count: 3 })?.passed
      ).toBe(true);
    });

    it('reports values that do not match their format', () => {
      const check = checkBody({ createdAt: 'yesterday', email: 'not-an-email', count: 3 });
      expect(check?.passed).toBe(false);
      expect(check?.message).toContain('date-time');
      expect(check?.message).toContain('email');
    });
  });

  it('should return empty checks if no response available', () => {
    const stepCtx = {
      $request: {
        header: {},
        path: '/breeds',
        url: 'https://catfact.ninja/',
        method: 'get',
        queryParams: {},
        pathParams: {},
        headerParams: {},
      },
      $response: undefined,
      $outputs: {},
    } as unknown as StepCallContext;

    const result = checkSchema({
      stepCallCtx: stepCtx,
      descriptionOperation,
      ctx,
    });

    expect(result).toEqual([]);
  });

  it('should match content type against wildcard in description', () => {
    const wildcardDescriptionOperation = {
      ...descriptionOperation,
      responses: {
        '200': {
          description: 'successful operation',
          content: {
            'application/*': {
              schema: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    breed: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    };
    const result = checkSchema({
      stepCallCtx,
      descriptionOperation: wildcardDescriptionOperation,
      ctx,
    });

    const contentTypeCheck = result.find((c) => c.name === CHECKS.CONTENT_TYPE_CHECK);
    expect(contentTypeCheck?.passed).toBe(true);

    const schemaCheck = result.find((c) => c.name === CHECKS.SCHEMA_CHECK);
    expect(schemaCheck).toBeDefined();
  });

  it('should check content type from description', () => {
    const stepCallCtx = {
      $request: {
        header: {},
        path: '/breeds',
        url: 'https://catfact.ninja/',
        method: 'get',
        queryParams: {},
        pathParams: {},
        headerParams: {},
      },
      $response: {
        body: {
          current_page: 1,
          data: [
            {
              breed: 'Abyssinian',
              country: 'Ethiopia',
              origin: 'Natural/Standard',
              coat: 'Short',
              pattern: 'Ticked',
            },
            {
              breed: 'Asian',
              country: 'developed in the United Kingdom (founding stock from Asia)',
              origin: '',
              coat: 'Short',
              pattern: 'Evenly solid',
            },
          ],
          first_page_url: 'https://catfact.ninja/breeds?page=1',
          from: 1,
          last_page: 4,
          last_page_url: 'https://catfact.ninja/breeds?page=4',
          links: [
            {
              url: null,
              label: 'Previous',
              active: false,
            },
            {
              url: 'https://catfact.ninja/breeds?page=1',
              label: '1',
              active: true,
            },
          ],
          next_page_url: 'https://catfact.ninja/breeds?page=2',
          path: 'https://catfact.ninja/breeds',
          per_page: 25,
          prev_page_url: null,
          to: 25,
          total: 98,
        },
        statusCode: 200,
        header: { 'content-type': 'application/text' },
        contentType: 'application/text',
      },
      $outputs: {},
    } as unknown as StepCallContext;

    const result = checkSchema({
      stepCallCtx,
      descriptionOperation,
      ctx,
    });

    expect(result).toEqual([
      {
        condition: '$statusCode in [200]',
        message: expect.stringContaining('200'),
        name: CHECKS.STATUS_CODE_CHECK,
        passed: true,
        severity: 'error',
      },
      {
        message: expect.stringContaining('response is not described in the schema.'),
        name: CHECKS.CONTENT_TYPE_CHECK,
        passed: false,
        severity: 'error',
      },
    ]);
  });
});

describe('statusCodeDiff', () => {
  it('should return the correct diff', () => {
    expect(cleanColors(statusCodeDiff(200, [200, 201]))).toBe(
      'Expected value to be in the list:\n  200, 201\nReceived:\n  200'
    );
  });

  it('should return the correct diff when the actual value is not in the expected list', () => {
    expect(cleanColors(statusCodeDiff(202, [200, 201]))).toBe(
      'Expected value to be in the list:\n  200, 201\nReceived:\n  202'
    );
  });
});
