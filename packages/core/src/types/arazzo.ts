import { mapOf, NodeType, listOf } from '.';

export const ARAZZO_ROOT_TYPE = 'Root';
import { DependentRequired, Schema, SchemaProperties } from './oas3_1';
import { Discriminator, DiscriminatorMapping, ExternalDocs, Xml } from './oas3';

export const operationMethod = {
  type: 'string',
  enum: ['get', 'post', 'put', 'delete', 'patch'],
} as const;
export const expectSchema = {
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
    type: { type: 'string', enum: ['openapi'] },
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
    type: { type: 'string', enum: ['none'] },
    'x-serverUrl': { type: 'string' },
  },
  additionalProperties: false,
  required: ['name', 'type', 'x-serverUrl'],
} as const;
const arazzoSourceDescriptionSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    type: { type: 'string', enum: ['arazzo'] },
    url: { type: 'string' },
  },
  additionalProperties: false,
  required: ['name', 'type', 'url'],
} as const;
export const sourceDescriptionSchema = {
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
export const parameter = {
  type: 'object',
  oneOf: [
    {
      type: 'object',
      properties: {
        in: { type: 'string', enum: ['header', 'query', 'path', 'cookie', 'body'] },
        name: { type: 'string' },
        value: {
          oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }],
        },
      },
      required: ['name', 'value'],
      additionalProperties: false,
    },
    {
      type: 'object',
      properties: {
        reference: { type: 'string' },
        value: {
          oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }],
        },
      },
      required: ['reference'],
      additionalProperties: false,
    },
  ],
} as const;
const parameters = {
  type: 'array',
  items: parameter,
} as const;
export const infoObject = {
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
export const replacement = {
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
export const requestBody = {
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
export const criteriaObject = {
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
export const inherit = {
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
export const step = {
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
        oneOf: [
          {
            type: 'string',
          },
          {
            type: 'object',
          },
          {
            type: 'array',
          },
          {
            type: 'boolean',
          },
          {
            type: 'number',
          },
        ],
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
const JSONSchema = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'],
    },
    properties: {
      type: 'object',
      additionalProperties: true,
    },
    required: {
      type: 'array',
      items: { type: 'string' },
    },
    items: {
      type: 'object',
      additionalProperties: true,
    },
  },
  required: ['type'],
  additionalProperties: true,
} as const;
export const workflow = {
  type: 'object',
  properties: {
    workflowId: { type: 'string' },
    summary: { type: 'string' },
    description: { type: 'string' },
    parameters: parameters,
    dependsOn: { type: 'array', items: { type: 'string' } },
    inputs: JSONSchema,
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
export const arazzoSchema = {
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

const Root: NodeType = {
  properties: {
    arazzo: { type: 'string', enum: ['1.0.0'] },
    info: 'Info',
    sourceDescriptions: 'SourceDescriptions',
    'x-parameters': 'Parameters',
    workflows: 'Workflows',
    components: 'Components',
  },
  required: ['arazzo', 'info', 'sourceDescriptions', 'workflows'],
  extensionsPrefix: 'x-',
};
const Components: NodeType = {
  properties: {
    inputs: 'NamedInputs',
    parameters: {
      type: 'object',
      additionalProperties: 'ParameterObject',
    },
    successActions: {
      type: 'object',
      additionalProperties: 'SuccessActionObject',
    },
    failureActions: {
      type: 'object',
      additionalProperties: 'FailureActionObject',
    },
  },
  extensionsPrefix: 'x-',
};
const NamedInputs: NodeType = mapOf('Schema');
const Info: NodeType = {
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    summary: { type: 'string' },
    version: { type: 'string' },
  },
  required: ['title', 'version'],
  extensionsPrefix: 'x-',
};
const SourceDescriptions: NodeType = {
  properties: {},
  items: (value: any) => {
    if (value?.type === 'openapi') {
      return 'OpenAPISourceDescription';
    } else if (value?.type === 'arazzo') {
      return 'ArazzoSourceDescription';
    } else {
      return 'NoneSourceDescription';
    }
  },
};
const OpenAPISourceDescription: NodeType = {
  properties: {
    name: { type: 'string' },
    type: { type: 'string', enum: ['openapi'] },
    url: { type: 'string' },
    'x-serverUrl': { type: 'string' },
  },
  required: ['name', 'type', 'url'],
  extensionsPrefix: 'x-',
};
const NoneSourceDescription: NodeType = {
  properties: {
    name: { type: 'string' },
    type: { type: 'string', enum: ['none'] },
    'x-serverUrl': { type: 'string' },
  },
  required: ['name', 'type', 'x-serverUrl'],
  extensionsPrefix: 'x-',
};
const ArazzoSourceDescription: NodeType = {
  properties: {
    name: { type: 'string' },
    type: { type: 'string', enum: ['arazzo'] },
    url: { type: 'string' },
  },
  required: ['name', 'type', 'url'],
  extensionsPrefix: 'x-',
};
const ReusableObject: NodeType = {
  properties: {
    reference: { type: 'string' },
    value: {
      type: 'string',
    },
  },
  required: ['reference'],
  extensionsPrefix: 'x-',
};
const ParameterObject: NodeType = {
  properties: {
    in: { type: 'string', enum: ['header', 'query', 'path', 'cookie', 'body'] },
    name: { type: 'string' },
    value: {}, // any
  },
  required: ['name', 'value'],
  extensionsPrefix: 'x-',
};
const Parameters: NodeType = {
  properties: {},
  items: (value: any) => {
    if (value?.in) {
      return 'ParameterObject';
    } else {
      return 'ReusableObject';
    }
  },
};
const Workflow: NodeType = {
  properties: {
    workflowId: { type: 'string' },
    summary: { type: 'string' },
    description: { type: 'string' },
    parameters: 'Parameters',
    dependsOn: { type: 'array', items: { type: 'string' } },
    inputs: 'NamedInputs',
    outputs: 'Outputs',
    steps: 'Steps',
    successActions: 'OnSuccessActionList',
    failureActions: 'OnFailureActionList',
  },
  required: ['workflowId', 'steps'],
  extensionsPrefix: 'x-',
};
const Workflows: NodeType = listOf('Workflow');
const Steps: NodeType = listOf('Step');
const Step: NodeType = {
  properties: {
    stepId: { type: 'string' },
    description: { type: 'string' },
    operationId: { type: 'string' },
    operationPath: { type: 'string' },
    workflowId: { type: 'string' },
    parameters: 'Parameters',
    successCriteria: listOf('CriterionObject'),
    onSuccess: 'OnSuccessActionList',
    onFailure: 'OnFailureActionList',
    outputs: 'Outputs',
    'x-inherit': { enum: ['auto', 'none'] },
    'x-expect': 'ExpectSchema',
    'x-assert': { type: 'string' },
    'x-operation': 'ExtendedOperation',
    requestBody: 'RequestBody',
  },
  required: ['stepId'],
  requiredOneOf: ['x-operation', 'operationId', 'operationPath', 'workflowId'],
  extensionsPrefix: 'x-',
};
const Outputs: NodeType = {
  properties: {},
  additionalProperties: {
    type: 'string',
  },
};
const RequestBody: NodeType = {
  properties: {
    contentType: { type: 'string' },
    payload: {},
    replacements: listOf('Replacement'),
  },
  required: ['payload'],
  extensionsPrefix: 'x-',
};
const Replacement: NodeType = {
  properties: {
    target: { type: 'string' },
    value: {},
  },
  required: ['target', 'replacement'],
  extensionsPrefix: 'x-',
};
const ExtendedOperation: NodeType = {
  properties: {
    path: { type: 'string' },
    method: {
      enum: ['get', 'post', 'put', 'delete', 'patch'],
    },
    sourceDescriptionName: { type: 'string' },
    serverUrl: { type: 'string' },
  },
  required: ['path', 'method'],
};
const ExpectSchema: NodeType = {
  properties: {
    statusCode: { type: 'number' },
    mimeType: { type: 'string' },
    body: {},
    schema: 'Schema',
  },
  requiredOneOf: ['statusCode', 'mimeType', 'body', 'schema'],
};
const CriterionObject: NodeType = {
  properties: {
    condition: { type: 'string' },
    context: { type: 'string' },
    type: (value: any) => {
      if (!value) {
        return undefined;
      } else if (typeof value === 'string') {
        return { enum: ['regex', 'jsonpath', 'simple', 'xpath'] };
      } else if (value.type === 'jsonpath') {
        return 'JSONPathCriterion';
      } else {
        return 'XPathCriterion';
      }
    },
  },
  required: ['condition'],
};
const JSONPathCriterion: NodeType = {
  properties: {
    type: { type: 'string', enum: ['jsonpath'] },
    version: { type: 'string', enum: ['draft-goessner-dispatch-jsonpath-00'] },
  },
};
const XPathCriterion: NodeType = {
  properties: {
    type: { type: 'string', enum: ['xpath'] },
    version: { type: 'string', enum: ['xpath-30', 'xpath-20', 'xpath-10'] },
  },
};
const SuccessActionObject: NodeType = {
  properties: {
    name: { type: 'string' },
    type: { type: 'string', enum: ['goto', 'end'] },
    stepId: { type: 'string' },
    workflowId: { type: 'string' },
    criteria: 'CriterionObject',
  },
  required: ['type', 'name'],
};
const OnSuccessActionList: NodeType = {
  properties: {},
  items: (value: any) => {
    if (value?.type && value?.name) {
      return 'SuccessActionObject';
    } else {
      return 'ReusableObject';
    }
  },
};
const FailureActionObject: NodeType = {
  properties: {
    name: { type: 'string' },
    type: { type: 'string', enum: ['goto', 'retry', 'end'] },
    workflowId: { type: 'string' },
    stepId: { type: 'string' },
    retryAfter: { type: 'number' },
    retryLimit: { type: 'number' },
    criteria: 'CriterionObject',
  },
  required: ['type', 'name'],
};
const OnFailureActionList: NodeType = {
  properties: {},
  items: (value: any) => {
    if (value?.type && value?.name) {
      return 'FailureActionObject';
    } else {
      return 'ReusableObject';
    }
  },
};

export const ArazzoTypes: Record<string, NodeType> = {
  Root,
  Info,
  SourceDescriptions,
  OpenAPISourceDescription,
  NoneSourceDescription,
  ArazzoSourceDescription,
  Parameters,
  ParameterObject,
  ReusableObject,
  Workflows,
  Workflow,
  Steps,
  Step,
  RequestBody,
  Replacement,
  ExtendedOperation,
  ExpectSchema,
  Outputs,
  CriterionObject,
  XPathCriterion,
  JSONPathCriterion,
  SuccessActionObject,
  OnSuccessActionList,
  FailureActionObject,
  OnFailureActionList,
  Schema,
  NamedSchemas: mapOf('Schema'),
  ExternalDocs,
  DiscriminatorMapping,
  Discriminator,
  DependentRequired,
  SchemaProperties,
  PatternProperties: SchemaProperties,
  Components,
  NamedInputs,
  Xml,
};
