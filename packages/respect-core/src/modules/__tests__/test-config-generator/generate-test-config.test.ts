import { generateTestConfig } from '../../test-config-generator';
import {
  bundleOpenApi,
  getOperationFromDescription,
  getRequestDataFromOpenApi,
} from '../../description-parser';

jest.mock('../../description-parser', () => ({
  bundleOpenApi: jest.fn(),
  getOperationFromDescription: jest.fn(),
  getRequestDataFromOpenApi: jest.fn(),
}));

const BUNDLED_DESCRIPTION_MOCK = {
  paths: {
    '/pet': {
      get: {
        operationId: 'getPet',
        responses: {
          200: {
            description: 'OK',
          },
        },
      },
    },
    '/fact': {
      get: {
        operationId: 'getFact',
        responses: {},
      },
    },
  },
  servers: [
    {
      url: 'https://petstore.swagger.io/v1',
    },
  ],
  info: {
    title: 'Swagger Petstore',
    version: '1.0.0',
  },
};

describe('generateTestConfig', () => {
  it('should generate test config', async () => {
    (bundleOpenApi as jest.Mock).mockReturnValue(BUNDLED_DESCRIPTION_MOCK);
    expect(
      await generateTestConfig({
        descriptionPath: 'description.yaml',
        extended: false,
      })
    ).toEqual({
      arazzo: '1.0.1',
      info: {
        title: 'Swagger Petstore',
        version: '1.0.0',
      },
      sourceDescriptions: [
        {
          name: 'description',
          type: 'openapi',
          url: 'description.yaml',
        },
      ],
      workflows: [
        {
          workflowId: 'get-pet-workflow',
          steps: [
            {
              operationId: '$sourceDescriptions.description.getPet',
              stepId: 'get-pet-step',
            },
          ],
        },
        {
          workflowId: 'get-fact-workflow',
          steps: [
            {
              operationId: '$sourceDescriptions.description.getFact',
              stepId: 'get-fact-step',
            },
          ],
        },
      ],
    });
  });

  it('should generate test config when output file is provided', async () => {
    (bundleOpenApi as jest.Mock).mockReturnValue(BUNDLED_DESCRIPTION_MOCK);
    expect(
      await generateTestConfig({
        descriptionPath: 'description.yaml',
        'output-file': './final-test-location/output.yaml',
        extended: false,
      })
    ).toEqual({
      arazzo: '1.0.1',
      info: {
        title: 'Swagger Petstore',
        version: '1.0.0',
      },
      sourceDescriptions: [
        {
          name: 'description',
          type: 'openapi',
          url: '../description.yaml',
        },
      ],
      workflows: [
        {
          workflowId: 'get-pet-workflow',
          steps: [
            {
              operationId: '$sourceDescriptions.description.getPet',
              stepId: 'get-pet-step',
            },
          ],
        },
        {
          workflowId: 'get-fact-workflow',
          steps: [
            {
              operationId: '$sourceDescriptions.description.getFact',
              stepId: 'get-fact-step',
            },
          ],
        },
      ],
    });
  });

  it('should generate test config with extended', async () => {
    (bundleOpenApi as jest.Mock).mockReturnValue(BUNDLED_DESCRIPTION_MOCK);
    (getOperationFromDescription as jest.Mock).mockReturnValue({
      responses: {
        200: {
          description: 'OK',
        },
      },
    });
    (getRequestDataFromOpenApi as jest.Mock).mockReturnValue({
      parameters: [
        {
          in: 'query',
          name: 'limit',
          schema: {
            type: 'integer',
            format: 'int32',
          },
        },
      ],
    });

    expect(
      await generateTestConfig({
        descriptionPath: 'description.yaml',
        extended: true,
      })
    ).toEqual({
      arazzo: '1.0.1',
      info: {
        title: 'Swagger Petstore',
        version: '1.0.0',
      },
      sourceDescriptions: [
        {
          name: 'description',
          type: 'openapi',
          url: 'description.yaml',
        },
      ],
      workflows: [
        {
          workflowId: 'get-pet-workflow',
          steps: [
            {
              operationId: '$sourceDescriptions.description.getPet',
              stepId: 'get-pet-step',
              successCriteria: [{ condition: '$statusCode == 200' }],
            },
          ],
        },
        {
          workflowId: 'get-fact-workflow',
          steps: [
            {
              operationId: '$sourceDescriptions.description.getFact',
              stepId: 'get-fact-step',
            },
          ],
        },
      ],
    });
  });

  it('should generate extended test config with not existing description', async () => {
    (bundleOpenApi as jest.Mock).mockReturnValue(undefined);
    expect(
      await generateTestConfig({
        descriptionPath: 'description.yaml',
        extended: false,
      })
    ).toEqual({
      arazzo: '1.0.1',
      info: {
        title: '[REPLACE WITH API title]',
        version: '[REPLACE WITH API version]',
      },
      serverUrl: undefined,
      sourceDescriptions: [
        {
          name: 'description',
          type: 'openapi',
          url: 'description.yaml',
        },
      ],
      workflows: [],
    });
  });
});
