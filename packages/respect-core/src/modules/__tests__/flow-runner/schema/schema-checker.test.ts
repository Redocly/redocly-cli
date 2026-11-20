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

  describe('response headers', () => {
    const headersDescriptionOperation = {
      ...descriptionOperation,
      responses: {
        '200': {
          description: 'successful operation',
          headers: {
            'X-Request-ID': { required: true, schema: { type: 'string' } },
            'X-Rate-Limit-Remaining': { required: false, schema: { type: 'integer' } },
            'Content-Type': { required: true, schema: { type: 'string' } },
          },
          content: { 'application/json': { schema: { type: 'object' } } },
        },
        '404': {
          description: 'not found',
          content: { 'application/json': { schema: { type: 'object' } } },
        },
      },
    };

    const checkHeaders = (statusCode: number, header: Record<string, string>) =>
      checkSchema({
        stepCallCtx: {
          ...stepCallCtx,
          $response: {
            body: {},
            statusCode,
            header,
            contentType: 'application/json',
          },
        } as unknown as StepCallContext,
        descriptionOperation: headersDescriptionOperation,
        ctx,
      }).find((c) => c.name === CHECKS.RESPONSE_HEADER_CHECK);

    it('passes when the required headers are present, in any case, with extra headers', () => {
      expect(checkHeaders(200, { 'x-request-id': 'abc', 'x-powered-by': 'test' })?.passed).toBe(
        true
      );
    });

    it('fails and names the missing required headers', () => {
      const check = checkHeaders(200, { 'x-rate-limit-remaining': '10' });
      expect(check?.passed).toBe(false);
      expect(check?.message).toContain('X-Request-ID');
      expect(check?.message).not.toContain('Content-Type');
      expect(check?.severity).toBe('error');
    });

    it('adds no check when the response describes no required headers', () => {
      expect(checkHeaders(404, {})).toBeUndefined();
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
