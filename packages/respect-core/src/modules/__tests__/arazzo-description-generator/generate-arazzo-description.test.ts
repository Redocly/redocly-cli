import { generateArazzoDescription } from '../../arazzo-description-generator/index.js';
import { type ParameterWithIn } from '../../context-parser/index.js';
import {
  bundleOpenApi,
  getOperationFromDescription,
  getRequestDataFromOpenApi,
  type OpenApiRequestData,
} from '../../description-parser/index.js';

vi.mock('../../description-parser/index.js');

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

const BUNDLED_DESCRIPTION_MOCK_WITHOUT_OPERATION_ID = {
  paths: {
    '/pet': {
      get: {
        responses: {
          200: {
            description: 'OK',
          },
        },
      },
    },
    '/fact': {
      get: {
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

describe('generateArazzoDescription', () => {
  it('should generate arazzo description when output file is provided', async () => {
    vi.mocked(bundleOpenApi).mockResolvedValue(BUNDLED_DESCRIPTION_MOCK);
    expect(
      await generateArazzoDescription({
        descriptionPath: 'description@35.oas.yaml',
        'output-file': './final-test-location/output.yaml',
      })
    ).toEqual({
      arazzo: '1.0.1',
      info: {
        title: 'Swagger Petstore',
        version: '1.0.0',
      },
      sourceDescriptions: [
        {
          name: 'description35-oas',
          type: 'openapi',
          url: '../description@35.oas.yaml',
        },
      ],
      workflows: [
        {
          workflowId: 'get-pet-workflow',
          steps: [
            {
              operationId: '$sourceDescriptions.description35-oas.getPet',
              stepId: 'get-pet-step',
              successCriteria: [{ condition: '$statusCode == 200' }],
            },
          ],
        },
        {
          workflowId: 'get-fact-workflow',
          steps: [
            {
              operationId: '$sourceDescriptions.description35-oas.getFact',
              stepId: 'get-fact-step',
            },
          ],
        },
      ],
    });
  });

  it('should generate arazzo description with operationId', async () => {
    vi.mocked(bundleOpenApi).mockResolvedValue(BUNDLED_DESCRIPTION_MOCK);
    vi.mocked(getOperationFromDescription).mockReturnValue({
      responses: {
        200: {
          description: 'OK',
        },
      },
    });
    vi.mocked(getRequestDataFromOpenApi).mockReturnValue({
      parameters: [
        {
          in: 'query',
          name: 'limit',
          schema: {
            type: 'integer',
            format: 'int32',
          },
          value: '10',
        } as ParameterWithIn,
      ],
    } as OpenApiRequestData);

    expect(
      await generateArazzoDescription({
        descriptionPath: 'description.yaml',
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

  it('should generate arazzo description with not existing description', async () => {
    vi.mocked(bundleOpenApi).mockResolvedValue(undefined);
    expect(
      await generateArazzoDescription({
        descriptionPath: 'description.yaml',
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

  it('should generate arazzo description with operationPath', async () => {
    vi.mocked(bundleOpenApi).mockResolvedValue(BUNDLED_DESCRIPTION_MOCK_WITHOUT_OPERATION_ID);
    vi.mocked(getOperationFromDescription).mockReturnValue({
      responses: {
        200: {
          description: 'OK',
        },
      },
    });
    vi.mocked(getRequestDataFromOpenApi).mockReturnValue({
      parameters: [
        {
          in: 'query',
          name: 'limit',
          schema: {
            type: 'integer',
            format: 'int32',
          },
          value: '10',
        } as ParameterWithIn,
      ],
    } as OpenApiRequestData);

    expect(
      await generateArazzoDescription({
        descriptionPath: 'description.yaml',
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
              operationPath: '{$sourceDescriptions.description.url}#/paths/~1pet/get',
              stepId: 'get-pet-step',
              successCriteria: [{ condition: '$statusCode == 200' }],
            },
          ],
        },
        {
          workflowId: 'get-fact-workflow',
          steps: [
            {
              operationPath: '{$sourceDescriptions.description.url}#/paths/~1fact/get',
              stepId: 'get-fact-step',
            },
          ],
        },
      ],
    });
  });
});
