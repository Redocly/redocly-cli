import { listOf, mapOf, type NodeType } from './index.js';
import { Oas3_2Types } from './oas3_2.js';

const Root: NodeType = {
  properties: {
    arazzo: {
      type: 'string',
      description: 'The version of the Arazzo specification that the document conforms to.',
    },
    info: 'Info',
    sourceDescriptions: 'SourceDescriptions',
    workflows: 'Workflows',
    components: 'Components',
  },
  required: ['arazzo', 'info', 'sourceDescriptions', 'workflows'],
  extensionsPrefix: 'x-',
};
const NamedParameters: NodeType = {
  properties: {},
  additionalProperties: 'Parameter',
};
const NamedSuccessActions: NodeType = {
  properties: {},
  additionalProperties: 'SuccessActionObject',
};
const NamedFailureActions: NodeType = {
  properties: {},
  additionalProperties: 'FailureActionObject',
};
const Components: NodeType = {
  properties: {
    inputs: 'NamedInputs',
    parameters: 'NamedParameters',
    successActions: 'NamedSuccessActions',
    failureActions: 'NamedFailureActions',
  },
  extensionsPrefix: 'x-',
};
const NamedInputs: NodeType = mapOf('Schema');
const Info: NodeType = {
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    summary: {
      type: 'string',
      description: `The object provides metadata about API workflows defined in this Arazzo document. The metadata MAY be used by the clients if needed.`,
      documentationLink: `https://spec.openapis.org/arazzo/latest.html#info-object`,
    },
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
    } else {
      return 'ArazzoSourceDescription';
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
    value: {}, // any
  },
  required: ['reference'],
  extensionsPrefix: 'x-',
};
const Parameter: NodeType = {
  properties: {
    in: { type: 'string', enum: ['header', 'query', 'path', 'cookie'] },
    name: { type: 'string' },
    value: {}, // any
  },
  required: ['name', 'value'],
  extensionsPrefix: 'x-',
};
const Parameters: NodeType = {
  properties: {},
  items: (value: any) => {
    if (value?.reference) {
      return 'ReusableObject';
    } else {
      return 'Parameter';
    }
  },
};
const Workflow: NodeType = {
  properties: {
    workflowId: {
      type: 'string',
      description: 'REQUIRED. The unique identifier of the workflow.',
    },
    summary: {
      type: 'string',
      description: 'A short summary of what the workflow does.',
    },
    description: {
      type: 'string',
      description:
        'A verbose explanation of the workflow behavior. CommonMark syntax MAY be used for rich text representation.',
    },
    parameters: 'Parameters',
    dependsOn: { type: 'array', items: { type: 'string' } },
    inputs: 'Schema',
    outputs: 'Outputs',
    steps: 'Steps',
    successActions: 'OnSuccessActionList',
    failureActions: 'OnFailureActionList',
    'x-security': 'ExtendedSecurityList',
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
    'x-operation': 'ExtendedOperation',
    'x-security': 'ExtendedSecurityList',
    requestBody: 'RequestBody',
  },
  required: ['stepId'],
  requiredOneOf: ['x-operation', 'operationId', 'operationPath', 'workflowId'],
  extensionsPrefix: 'x-',
  documentationLink: 'https://spec.openapis.org/arazzo/latest.html#step-object',
  description: 'A step in a workflow.',
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
  required: ['target', 'value'],
  extensionsPrefix: 'x-',
};

const ExtendedSecurity: NodeType = {
  properties: {
    schemeName: { type: 'string' },
    values: {},
    scheme: 'SecurityScheme',
  },
  required: ['values'],
  requiredOneOf: ['schemeName', 'scheme'],
};
const ExtendedOperation: NodeType = {
  properties: {
    url: { type: 'string' },
    method: {
      enum: [
        'get',
        'post',
        'put',
        'delete',
        'patch',
        'head',
        'options',
        'trace',
        'connect',
        'query',
        'GET',
        'POST',
        'PUT',
        'DELETE',
        'PATCH',
        'OPTIONS',
        'HEAD',
        'TRACE',
        'CONNECT',
        'QUERY',
      ],
    },
  },
  required: ['url', 'method'],
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
      } else if (value?.type === 'jsonpath') {
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
    criteria: listOf('CriterionObject'),
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
    retryAfter: { type: 'number', minimum: 0 },
    retryLimit: { type: 'number', minimum: 0 },
    criteria: listOf('CriterionObject'),
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

export const Arazzo1Types: Record<string, NodeType> = {
  Root,
  Info,
  SourceDescriptions,
  OpenAPISourceDescription,
  ArazzoSourceDescription,
  Parameters,
  Parameter,
  ReusableObject,
  Workflows,
  Workflow,
  Steps,
  Step,
  RequestBody,
  Replacement,
  ExtendedOperation,
  ExtendedSecurityList: listOf('ExtendedSecurity'),
  ExtendedSecurity,
  Outputs,
  CriterionObject,
  XPathCriterion,
  JSONPathCriterion,
  SuccessActionObject,
  OnSuccessActionList,
  FailureActionObject,
  OnFailureActionList,
  Schema: Oas3_2Types.Schema,
  NamedSchemas: mapOf('Schema'),
  ExternalDocs: Oas3_2Types.ExternalDocs,
  DiscriminatorMapping: Oas3_2Types.DiscriminatorMapping,
  Discriminator: Oas3_2Types.Discriminator,
  DependentRequired: Oas3_2Types.DependentRequired,
  SchemaProperties: Oas3_2Types.SchemaProperties,
  PatternProperties: Oas3_2Types.SchemaProperties,
  Components,
  NamedInputs,
  NamedParameters,
  NamedSuccessActions,
  NamedFailureActions,
  Xml: Oas3_2Types.Xml,
  SecurityScheme: Oas3_2Types.SecurityScheme,
  OAuth2Flows: Oas3_2Types.OAuth2Flows,
  ImplicitFlow: Oas3_2Types.ImplicitFlow,
  PasswordFlow: Oas3_2Types.PasswordFlow,
  ClientCredentials: Oas3_2Types.ClientCredentials,
  AuthorizationCode: Oas3_2Types.AuthorizationCode,
  DeviceAuthorization: Oas3_2Types.DeviceAuthorization,
};
