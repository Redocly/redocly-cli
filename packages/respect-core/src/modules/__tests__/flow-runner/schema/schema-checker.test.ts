import { logger } from '@redocly/openapi-core';

import type { StepCallContext, TestContext } from '../../../../types.js';

import { CHECKS, checkSchema } from '../../../flow-runner/index.js';
import { DEFAULT_SEVERITY_CONFIGURATION } from '../../../checks/severity.js';

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
  });

  it('should catch ajvStrict.validate error', () => {
    vi.spyOn(require('@redocly/ajv/dist/2020').prototype, 'validate').mockImplementationOnce(() => {
      throw new Error('ajvStrict.validate error');
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
      {
        message: 'Ajv error: ajvStrict.validate error',
        name: CHECKS.SCHEMA_CHECK,
        passed: false,
        severity: 'error',
      },
    ]);
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
