import type { TestContext } from '../../../types.js';

import { cleanColors } from '../../../utils/clean-colors.js';
import {
  getOperationFromDescriptionBySource,
  getOperationFromDescription,
  DescriptionSource,
} from '../../description-parser/index.js';
import { ApiFetcher } from '../../../utils/api-fetcher.js';

describe('getOperationFromDescriptionBySource', () => {
  const apiClient = new ApiFetcher({});
  const context = {
    apiClient,
    $sourceDescriptions: {
      cats: {
        paths: {
          '/pet': {
            get: {
              operationId: 'getPet',
            },
            post: {
              operationId: 'postPet',
            },
          },
          '/pet/{petId}': {
            get: {
              operationId: 'getPetById',
            },
            delete: {
              operationId: 'deletePetById',
            },
          },
        },
      },
    },
    sourceDescriptions: [
      {
        name: 'cats',
        type: 'openapi',
        url: 'https://raw.githubusercontent.com/swagger-api/swagger-petstore/master/src/main/resources/openapi.yaml',
      },
    ],
  } as unknown as TestContext;

  describe('when operationPath is provided', () => {
    it('should return the operation if it exists', () => {
      const operation = getOperationFromDescriptionBySource(
        {
          operationPath:
            'https://raw.githubusercontent.com/swagger-api/swagger-petstore/master/src/main/resources/openapi.yaml#/paths/~1pet/get',
        },
        context
      );

      expect(operation).toEqual({
        operationId: 'getPet',
        method: 'get',
        path: '/pet',
        servers: undefined,
        descriptionName: 'cats',
        pathParameters: [],
      });
    });

    it('should return the operation if it exists in sourceDescriptions', () => {
      const operation = getOperationFromDescriptionBySource(
        {
          operationPath: '$sourceDescriptions.cats#/paths/~1pet/get',
        },
        context
      );

      expect(operation).toEqual({
        operationId: 'getPet',
        method: 'get',
        path: '/pet',
        servers: undefined,
        descriptionName: 'cats',
        pathParameters: [],
      });
    });

    it('should throw an error if description does not exist in sourceDescriptions', () => {
      try {
        getOperationFromDescriptionBySource(
          {
            operationPath:
              'https://raw.githubusercontent.com/swagger-api/swagger-petstore/master/src/main/resources/not-existing.yaml#/paths/~1pet/post',
          },
          context
        );
      } catch (e) {
        expect(cleanColors(e.message)).toEqual(
          "Unknown operationPath https://raw.githubusercontent.com/swagger-api/swagger-petstore/master/src/main/resources/not-existing.yaml#/paths/~1pet/post. API description https://raw.githubusercontent.com/swagger-api/swagger-petstore/master/src/main/resources/not-existing.yaml is not listed in 'sourceDescriptions' workflow section."
        );
      }
    });

    it('should throw an error if operation does not exist', () => {
      try {
        getOperationFromDescriptionBySource(
          {
            operationPath:
              'https://raw.githubusercontent.com/swagger-api/swagger-petstore/master/src/main/resources/openapi.yaml#/paths/~1not-existing/get',
          },
          context
        );
      } catch (e) {
        expect(e.message).toEqual('Invalid reference token: /not-existing');
      }
    });

    it('should throw an error if described sourceDescriptions missing', () => {
      const context = {
        $sourceDescriptions: {
          cats: {
            paths: {
              '/pet': {
                get: {
                  operationId: 'getPet',
                },
                post: {
                  operationId: 'postPet',
                },
              },
              '/pet/{petId}': {
                get: {
                  operationId: 'cats.getPetById}',
                },
                delete: {
                  operationId: 'deletePetById',
                },
              },
            },
          },
        },
      } as unknown as TestContext;
      try {
        getOperationFromDescriptionBySource(
          {
            operationPath:
              'https://raw.githubusercontent.com/swagger-api/swagger-petstore/master/src/main/resources/openapi.yaml#/paths/~1not-existing/get',
          },
          context
        );
      } catch (e) {
        expect(e.message).toEqual('Missing described sourceDescriptions');
      }
    });

    it('should throw an error if Invalid fragment identifier', () => {
      try {
        getOperationFromDescriptionBySource(
          {
            operationPath:
              'https://raw.githubusercontent.com/swagger-api/swagger-petstore/master/src/main/resources/openapi.yaml#/not-existing',
          },
          context
        );
      } catch (e) {
        expect(cleanColors(e.message)).toEqual(
          'Invalid fragment identifier: /not-existing at operationPath https://raw.githubusercontent.com/swagger-api/swagger-petstore/master/src/main/resources/openapi.yaml#/not-existing.'
        );
      }
    });

    it('should return the operation if it exists based on autogenerated operationId', () => {
      const operation = getOperationFromDescriptionBySource(
        {
          operationPath:
            'https://raw.githubusercontent.com/swagger-api/swagger-petstore/master/src/main/resources/openapi.yaml#/paths/~1pet~1{petId}/get',
        },
        context
      );

      expect(operation).toEqual({
        operationId: 'getPetById',
        method: 'get',
        path: '/pet/{petId}',
        servers: undefined,
        descriptionName: 'cats',
        pathParameters: [],
      });
    });
  });

  describe('when operationId is provided', () => {
    it('should return the operation if it exists', () => {
      const operation = getOperationFromDescriptionBySource(
        {
          operationId: 'cats.getPet',
        },
        context
      );

      expect(operation).toEqual({
        operationId: 'getPet',
        method: 'get',
        path: '/pet',
        descriptionName: 'cats',
        pathParameters: [],
        servers: undefined,
      });
    });

    it('should return the operation from first available description if operationId does not have dot notation', () => {
      const operation = getOperationFromDescriptionBySource(
        {
          operationId: 'getPet',
        },
        context
      );

      expect(operation).toEqual({
        operationId: 'getPet',
        method: 'get',
        path: '/pet',
        descriptionName: 'cats',
        pathParameters: [],
        servers: undefined,
      });
    });

    it('should return the operation if it exists based on autogenerated operationId', () => {
      const operation = getOperationFromDescriptionBySource(
        {
          operationId: 'cats.getPetById',
        },
        context
      );

      expect(operation).toEqual({
        operationId: 'getPetById',
        method: 'get',
        path: '/pet/{petId}',
        descriptionName: 'cats',
        pathParameters: [],
        servers: undefined,
      });
    });

    it('should throw an error if the operation does not exist', () => {
      try {
        getOperationFromDescriptionBySource(
          {
            operationId: 'cats.getPetByStatus',
          },
          context
        );
      } catch (e) {
        expect(cleanColors(e.message)).toEqual(
          'Unknown operationId getPetByStatus at cats.getPetByStatus.'
        );
      }
    });

    it('should throw an error if the description does not exist', () => {
      try {
        getOperationFromDescriptionBySource(
          {
            operationId: 'catss.getPetByStatus',
          },
          context
        );
      } catch (e) {
        expect(cleanColors(e.message)).toEqual(
          'Unknown description name catss at catss.getPetByStatus. Available descriptions: cats.'
        );
      }
    });

    it('should return undefined if no path details available', () => {
      const context = {
        $sourceDescriptions: {
          cats: {
            paths: {
              '/create': undefined,
            },
          },
        },
        sourceDescriptions: [
          {
            name: 'cats',
            type: 'openapi',
            url: 'https://raw.githubusercontent.com/swagger-api/swagger-petstore/master/src/main/resources/openapi.yaml',
          },
        ],
      } as unknown as TestContext;

      const operation = getOperationFromDescriptionBySource(
        {
          operationId: 'cats.create',
        },
        context
      );

      expect(operation).toEqual(undefined);
    });

    it('should return operation if it exists from single description when operationId is like $sourceDescriptions.DESCRIPTION_NAME.OPERATION_ID', () => {
      const operation = getOperationFromDescriptionBySource(
        {
          operationId: '$sourceDescriptions.cats.getPet',
        },
        context
      );

      expect(operation).toEqual({
        descriptionName: 'cats',
        operationId: 'getPet',
        method: 'get',
        path: '/pet',
        pathParameters: [],
        servers: undefined,
      });
    });
  });

  describe('when exactly one sourceDescription is provided', () => {
    it('should return undefined if it exists from single description', () => {
      const context = {
        $sourceDescriptions: {
          cats: {
            paths: {
              '/pet': {
                get: {
                  operationId: 'getPet',
                },
                post: {
                  operationId: 'postPet',
                },
              },
              '/pet/{petId}': {
                get: {
                  operationId: 'cats.getPetById',
                },
                delete: {
                  operationId: 'deletePetById',
                },
              },
            },
          },
        },
        sourceDescriptions: [],
      } as unknown as TestContext;

      const operation = getOperationFromDescriptionBySource(
        {
          path: '/pet',
          method: 'get',
        } as unknown as DescriptionSource,
        context
      );

      expect(operation).toEqual(undefined);
    });
  });

  describe('when source is not provided', () => {
    it('should return undefined', () => {
      const operation = getOperationFromDescriptionBySource({}, context);
      expect(operation).toEqual(undefined);
    });
  });
});

describe('getOperationFromDescription', () => {
  const descriptionPaths = {
    '/pet': {
      get: {
        operationId: 'getPet',
      },
      post: {
        operationId: 'postPet',
      },
    },
    '/pet/{petId}': {
      get: {
        operationId: 'getPetById',
      },
      delete: {
        operationId: 'deletePetById',
      },
    },
  };

  it('should return the operation if it exists', () => {
    const operation = getOperationFromDescription('/pet', 'get', descriptionPaths);

    expect(operation).toEqual({
      operationId: 'getPet',
    });
  });

  it('should return {} if the operation does not exist', () => {
    const operation = getOperationFromDescription('/pet', 'delete', descriptionPaths);

    expect(operation).toEqual(undefined);
  });
});
