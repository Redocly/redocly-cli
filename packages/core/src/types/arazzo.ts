import type { NodeType } from '.';

import { getNodeTypesFromJSONSchema } from './json-schema-adapter';

export const ARAZZO_ROOT_TYPE = 'Root';

const operationMethod = {
  type: 'string',
  enum: ['get', 'post', 'put', 'delete', 'patch'],
} as const;
const expectSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'number' },
    mimeType: { type: 'string' },
    body: {},
    schema: {
      type: 'object',
      additionalProperties: true,
    },
  },
  additionalProperties: false,
  oneOf: [
    { required: ['statusCode'] },
    { required: ['mimeType'] },
    { required: ['body'] },
    { required: ['schema'] },
  ],
} as const;
const openAPISourceDescriptionSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    type: { type: 'string', const: 'openapi' },
    url: { type: 'string' },
    'x-serverUrl': { type: 'string' },
  },
  additionalProperties: false,
  required: ['name', 'type', 'url'],
} as const;
const noneSourceDescriptionSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    type: { type: 'string', const: 'none' },
    'x-serverUrl': { type: 'string' },
  },
  additionalProperties: false,
  required: ['name', 'type', 'x-serverUrl'],
} as const;
const arazzoSourceDescriptionSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    type: { type: 'string', const: 'arazzo' },
    url: { type: 'string' },
  },
  additionalProperties: false,
  required: ['name', 'type', 'url'],
} as const;
const sourceDescriptionSchema = {
  type: 'object',
  oneOf: [
    openAPISourceDescriptionSchema,
    noneSourceDescriptionSchema,
    arazzoSourceDescriptionSchema,
  ],
} as const;
const sourceDescriptionsSchema = {
  type: 'array',
  items: sourceDescriptionSchema,
} as const;
const extendedOperation = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    method: operationMethod,
    sourceDescriptionName: { type: 'string' },
    serverUrl: { type: 'string' },
  },
  additionalProperties: false,
  required: ['path', 'method'],
} as const;
const parameter = {
  type: 'object',
  properties: {
    in: { type: 'string', enum: ['header', 'query', 'path', 'cookie'] },
    name: { type: 'string' },
    value: {
      oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }],
    },
    $ref: { type: 'string' },
    style: { type: 'string' },
    target: { type: 'string' },
    required: { type: 'boolean' },
    schema: {
      type: 'object',
      additionalProperties: true,
    },
    example: {
      type: 'object',
      additionalProperties: true,
    },
    examples: {
      oneOf: [{ type: 'object' }, { type: 'object', properties: { $ref: { type: 'string' } } }],
    },
  },
  additionalProperties: false,
  required: ['name', 'value'],
} as const;
const parameters = {
  type: 'array',
  items: parameter,
} as const;
const infoObject = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    summary: { type: 'string' },
    version: { type: 'string' },
  },
  additionalProperties: false,
  required: ['title', 'version'],
} as const;
const replacement = {
  type: 'object',
  properties: {
    target: { type: 'string' },
    value: {
      oneOf: [
        { type: 'string' },
        { type: 'object' },
        { type: 'array' },
        { type: 'number' },
        { type: 'boolean' },
      ],
    },
  },
} as const;
const requestBody = {
  type: 'object',
  properties: {
    contentType: { type: 'string' },
    payload: {
      oneOf: [
        { type: 'string' },
        { type: 'object', additionalProperties: true },
        { type: 'array' },
        { type: 'number' },
        { type: 'boolean' },
      ],
    },
    encoding: { type: 'string' },
    replacements: {
      type: 'array',
      items: replacement,
    },
  },
  additionalProperties: false,
  required: ['payload'],
} as const;
const criteriaObject = {
  type: 'object',
  properties: {
    condition: { type: 'string' },
    context: { type: 'string' },
    type: {
      oneOf: [
        { type: 'string', enum: ['regex', 'jsonpath', 'simple', 'xpath'] },
        {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['jsonpath'] },
            version: { type: 'string', enum: ['draft-goessner-dispatch-jsonpath-00'] },
          },
        },
        {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['xpath'] },
            version: { type: 'string', enum: ['xpath-30', 'xpath-20', 'xpath-10'] },
          },
        },
      ],
    },
  },
  required: ['condition'],
  additionalProperties: false,
} as const;
const criteriaObjects = {
  type: 'array',
  items: criteriaObject,
} as const;
const inherit = {
  type: 'string',
  enum: ['auto', 'none'],
} as const;
const onSuccessObject = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    type: { type: 'string', enum: ['goto', 'end'] },
    stepId: { type: 'string' },
    workflowId: { type: 'string' },
    criteria: criteriaObjects,
  },
  additionalProperties: false,
  required: ['type', 'name'],
} as const;
const onSuccessList = {
  type: 'array',
  items: onSuccessObject,
} as const;
const onFailureObject = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    type: { type: 'string', enum: ['goto', 'retry', 'end'] },
    workflowId: { type: 'string' },
    stepId: { type: 'string' },
    retryAfter: { type: 'number' },
    retryLimit: { type: 'number' },
    criteria: criteriaObjects,
  },
  additionalProperties: false,
  required: ['type', 'name'],
} as const;
const onFailureList = {
  type: 'array',
  items: onFailureObject,
} as const;
const step = {
  type: 'object',
  properties: {
    stepId: { type: 'string' },
    description: { type: 'string' },
    operationId: { type: 'string' },
    operationPath: { type: 'string' },
    workflowId: { type: 'string' },
    parameters: parameters,
    successCriteria: criteriaObjects,
    onSuccess: onSuccessList,
    onFailure: onFailureList,
    outputs: {
      type: 'object',
      additionalProperties: {
        type: 'string',
      },
    },
    'x-inherit': inherit,
    'x-expect': expectSchema,
    'x-assert': { type: 'string' },
    'x-operation': extendedOperation,
    requestBody: requestBody,
  },
  required: ['stepId'],
  oneOf: [
    { required: ['x-operation'] },
    { required: ['operationId'] },
    { required: ['operationPath'] },
    { required: ['workflowId'] },
  ],
} as const;
const steps = {
  type: 'array',
  items: step,
} as const;
const workflow = {
  type: 'object',
  properties: {
    workflowId: { type: 'string' },
    summary: { type: 'string' },
    description: { type: 'string' },
    parameters: parameters,
    dependsOn: { type: 'array', items: { type: 'string' } },
    inputs: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
        },
        properties: {
          type: 'object',
          additionalProperties: true,
        },
      },
      required: ['type'],
    },
    outputs: {
      type: 'object',
      additionalProperties: {
        type: 'string',
      },
    },
    steps: steps,
    successActions: {
      type: 'array',
      items: onSuccessObject,
    },
    failureActions: {
      type: 'array',
      items: onFailureObject,
    },
  },
  additionalProperties: false,
  required: ['workflowId', 'steps'],
} as const;
const workflows = {
  type: 'array',
  items: workflow,
} as const;
export const workflowSchema = {
  type: 'object',
  properties: {
    arazzo: { type: 'string', enum: ['1.0.0'] },
    info: infoObject,
    sourceDescriptions: sourceDescriptionsSchema,
    'x-parameters': parameters,
    workflows: workflows,
    components: {
      type: 'object',
      properties: {
        inputs: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            additionalProperties: true,
            properties: {
              type: {
                type: 'string',
              },
              properties: {
                type: 'object',
                additionalProperties: true,
              },
            },
            required: ['type'],
          },
        },
        parameters: {
          type: 'object',
          additionalProperties: parameter,
        },
        successActions: {
          type: 'object',
          additionalProperties: onSuccessObject,
        },
        failureActions: {
          type: 'object',
          additionalProperties: onFailureObject,
        },
      },
    },
  },
  additionalProperties: false,
  required: ['arazzo', 'info', 'sourceDescriptions', 'workflows'],
} as const;

export const ArazzoTypes: Record<string, NodeType> = getNodeTypesFromJSONSchema(
  ARAZZO_ROOT_TYPE,
  workflowSchema
);
