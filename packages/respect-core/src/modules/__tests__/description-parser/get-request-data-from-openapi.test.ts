import { logger } from '@redocly/openapi-core';

import type { OperationDetails } from '../../description-parser/get-operation-from-description.js';
import { getRequestDataFromOpenApi } from '../../description-parser/get-request-data-from-openapi.js';

describe('getRequestDataFromOpenApi', () => {
  it('should pass x-allowReserved only on query parameters where it is set', () => {
    const operation = {
      method: 'get',
      path: '/search',
      descriptionName: 'test',
      pathParameters: [],
      parameters: [
        {
          name: 'filter',
          in: 'query',
          required: true,
          allowReserved: true,
          schema: { type: 'string' },
        },
        {
          name: 'page',
          in: 'query',
          required: true,
          example: 1,
          schema: { type: 'integer' },
        },
      ],
      responses: {},
    } as OperationDetails;

    const result = getRequestDataFromOpenApi(operation, logger);

    const filterParam = result.parameters.find((p) => p.name === 'filter');
    expect(filterParam?.allowReserved).toBe(true);

    const pageParam = result.parameters.find((p) => p.name === 'page');
    expect(pageParam).toBeDefined();
    expect(pageParam?.allowReserved).toBeUndefined();
  });
});
