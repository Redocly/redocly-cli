import Ajv from '@redocly/ajv/dist/2020.js';
import { logger } from '@redocly/openapi-core';

import type { StepCallContext, TestContext } from '../../../../types.js';
import { cleanColors } from '../../../../utils/clean-colors.js';
import { DEFAULT_SEVERITY_CONFIGURATION } from '../../../checks/severity.js';
import {
  CHECKS,
  checkSchema,
  hasLargeDiscriminator,
  statusCodeDiff,
  resolveContentByType,
} from '../../../flow-runner/index.js';

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

  it('should check circular referenced schema', () => {
    vi.spyOn(logger, 'output').mockImplementation(() => {});
    vi.spyOn(JSON, 'stringify').mockImplementationOnce(() => {
      throw new Error('circular reference');
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
    ]);
    expect(logger.output).toHaveBeenCalledWith(
      expect.stringContaining('WARNING: schema have circular references')
    );
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

  it('should validate schemas with 150+ discriminator variants without exceeding call stack', () => {
    const variantsCount = 150;
    const mapping: Record<string, string> = {};
    for (let i = 0; i < variantsCount; i++) {
      mapping[`type_${i}`] = `#/components/schemas/Type_${i}`;
    }

    const largeDiscriminatorSchema = {
      type: 'object',
      discriminator: {
        propertyName: 'type',
        mapping,
      },
      anyOf: [
        {
          type: 'object',
          required: ['type', 'id'],
          properties: {
            type: { type: 'string' },
            id: { type: 'string' },
          },
        },
      ],
    };

    const result = checkSchema({
      stepCallCtx: {
        $request: {
          header: {},
          path: '/orders',
          url: 'https://example.com/',
          method: 'post',
          queryParams: {},
          pathParams: {},
          headerParams: {},
        },
        $response: {
          body: {
            type: 'type_0',
            id: 'ord_123',
          },
          statusCode: 200,
          header: new Headers({ 'content-type': 'application/json' }),
          contentType: 'application/json',
        },
        $outputs: {},
      } as unknown as StepCallContext,
      descriptionOperation: {
        responses: {
          '200': {
            description: 'success',
            content: {
              'application/json': {
                schema: largeDiscriminatorSchema,
              },
            },
          },
        },
      },
      ctx,
    });

    const schemaCheck = result.find((c) => c.name === CHECKS.SCHEMA_CHECK);
    expect(schemaCheck?.passed).toBe(true);
    expect(schemaCheck?.message).toBe('');
  });

  it('should fallback to non-discriminator validator when Maximum call stack size exceeded is encountered', () => {
    const compileSpy = vi.spyOn((Ajv as any).prototype, 'compile').mockImplementationOnce(() => {
      throw new RangeError('Maximum call stack size exceeded');
    });

    const result = checkSchema({
      stepCallCtx,
      descriptionOperation,
      ctx,
    });

    const schemaCheck = result.find((c) => c.name === CHECKS.SCHEMA_CHECK);
    expect(schemaCheck).toBeDefined();
    expect(schemaCheck?.message).not.toContain('Maximum call stack size exceeded');
    compileSpy.mockRestore();
  });
});

describe('hasLargeDiscriminator', () => {
  it('should return true when discriminator mapping has 100 or more entries', () => {
    const mapping: Record<string, string> = {};
    for (let i = 0; i < 100; i++) {
      mapping[`type_${i}`] = `#/components/schemas/Type_${i}`;
    }
    const schema = {
      type: 'object',
      discriminator: {
        propertyName: 'type',
        mapping,
      },
    };
    expect(hasLargeDiscriminator(schema)).toBe(true);
  });

  it('should return true when discriminator oneOf has 100 or more variants', () => {
    const oneOf = Array.from({ length: 100 }, (_, i) => ({
      type: 'object',
      properties: { type: { const: `type_${i}` } },
    }));
    const schema = {
      type: 'object',
      discriminator: { propertyName: 'type' },
      oneOf,
    };
    expect(hasLargeDiscriminator(schema)).toBe(true);
  });

  it('should return true when a variant discriminator property enum has 100 or more values', () => {
    const enumValues = Array.from({ length: 100 }, (_, i) => `type_${i}`);
    const schema = {
      type: 'object',
      discriminator: { propertyName: 'type' },
      oneOf: [
        {
          type: 'object',
          properties: {
            type: { type: 'string', enum: enumValues },
          },
        },
      ],
    };
    expect(hasLargeDiscriminator(schema)).toBe(true);
  });

  it('should return false for schemas with fewer than 100 variants', () => {
    const schema = {
      type: 'object',
      discriminator: {
        propertyName: 'type',
        mapping: {
          cat: '#/components/schemas/Cat',
          dog: '#/components/schemas/Dog',
        },
      },
      oneOf: [
        { type: 'object', properties: { type: { const: 'cat' } } },
        { type: 'object', properties: { type: { const: 'dog' } } },
      ],
    };
    expect(hasLargeDiscriminator(schema)).toBe(false);
  });

  it('should safely handle circular references without overflowing stack', () => {
    const circularSchema: Record<string, any> = {
      type: 'object',
      properties: {},
    };
    circularSchema.properties.self = circularSchema;
    expect(hasLargeDiscriminator(circularSchema)).toBe(false);
  });

  it('should detect large discriminator nested under composition arrays (allOf, oneOf, anyOf)', () => {
    const mapping: Record<string, string> = {};
    for (let i = 0; i < 100; i++) {
      mapping[`type_${i}`] = `#/components/schemas/Type_${i}`;
    }
    const discriminatedSchema = {
      type: 'object',
      discriminator: {
        propertyName: 'type',
        mapping,
      },
    };

    expect(
      hasLargeDiscriminator({
        type: 'object',
        allOf: [{ type: 'object', properties: { id: { type: 'string' } } }, discriminatedSchema],
      })
    ).toBe(true);

    expect(
      hasLargeDiscriminator({
        oneOf: [{ type: 'string' }, discriminatedSchema],
      })
    ).toBe(true);

    expect(
      hasLargeDiscriminator({
        anyOf: [{ type: 'null' }, discriminatedSchema],
      })
    ).toBe(true);
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

describe('resolveContentByType', () => {
  it('should return undefined when content is undefined', () => {
    expect(resolveContentByType(undefined, 'application/json')).toBeUndefined();
  });

  it('should return exact match by content type', () => {
    const content = {
      'application/json': { schema: { type: 'object' } },
      'text/plain': { schema: { type: 'string' } },
    };
    expect(resolveContentByType(content, 'application/json')).toEqual({
      schema: { type: 'object' },
    });
  });

  it('should match */* wildcard pattern', () => {
    const content = {
      '*/*': { schema: { type: 'string' } },
    };
    expect(resolveContentByType(content, 'application/json')).toEqual({
      schema: { type: 'string' },
    });
    expect(resolveContentByType(content, 'text/plain')).toEqual({
      schema: { type: 'string' },
    });
  });

  it('should match type/* wildcard pattern', () => {
    const content = {
      'application/*': { schema: { type: 'object' } },
    };
    expect(resolveContentByType(content, 'application/json')).toEqual({
      schema: { type: 'object' },
    });
    expect(resolveContentByType(content, 'application/xml')).toEqual({
      schema: { type: 'object' },
    });
    expect(resolveContentByType(content, 'text/plain')).toBeUndefined();
  });

  it('should prefer exact match over wildcard', () => {
    const content = {
      'application/json': { schema: { type: 'object' } },
      '*/*': { schema: { type: 'string' } },
    };
    expect(resolveContentByType(content, 'application/json')).toEqual({
      schema: { type: 'object' },
    });
  });

  it('should return undefined when no pattern matches', () => {
    const content = {
      'application/json': { schema: { type: 'object' } },
      'text/*': { schema: { type: 'string' } },
    };
    expect(resolveContentByType(content, 'image/png')).toBeUndefined();
  });

  it('should return first matching wildcard when multiple wildcards match', () => {
    const content = {
      'application/*': { schema: { type: 'object' } },
      '*/*': { schema: { type: 'string' } },
    };
    const result = resolveContentByType(content, 'application/json');
    expect(result).toEqual({ schema: { type: 'object' } });
  });

  it('should match */subtype wildcard pattern', () => {
    const content = {
      '*/json': { schema: { type: 'object' } },
    };
    expect(resolveContentByType(content, 'application/json')).toEqual({
      schema: { type: 'object' },
    });
    expect(resolveContentByType(content, 'text/json')).toEqual({
      schema: { type: 'object' },
    });
    expect(resolveContentByType(content, 'application/xml')).toBeUndefined();
  });

  it('should match content type case-insensitively', () => {
    const content = {
      'Application/JSON': { schema: { type: 'object' } },
    };
    expect(resolveContentByType(content, 'application/json')).toEqual({
      schema: { type: 'object' },
    });
  });
});
