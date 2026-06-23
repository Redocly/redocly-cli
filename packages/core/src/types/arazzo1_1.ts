import { isPlainObject } from '../utils/is-plain-object.js';
import { Arazzo1Types } from './arazzo.js';
import type { NodeType } from './index.js';

const Root: NodeType = {
  ...Arazzo1Types.Root,
  properties: {
    ...Arazzo1Types.Root.properties,
    $self: {
      type: 'string',
      description:
        'This string MUST be in the form of a URI-reference as defined by [RFC3986] Section 4.1. The $self field provides the self-assigned URI of this document, which also serves as its base URI in accordance with [RFC3986] Section 5.1.1.',
    },
  },
};

const SourceDescriptions: NodeType = {
  properties: {},
  items: (value: any) => {
    if (value?.type === 'openapi') {
      return 'OpenAPISourceDescription';
    } else if (value?.type === 'asyncapi') {
      return 'AsyncAPISourceDescription';
    } else {
      return 'ArazzoSourceDescription';
    }
  },
};

const AsyncAPISourceDescription: NodeType = {
  properties: {
    name: {
      type: 'string',
      description: `REQUIRED. A unique name for the source description. Tools and libraries MAY use the name to uniquely identify a source description, therefore, it is RECOMMENDED to follow common programming naming conventions. SHOULD conform to the regular expression [A-Za-z0-9_-]+.`,
    },
    type: {
      type: 'string',
      enum: ['asyncapi'],
      description: 'The type of source description. Possible values are "asyncapi".',
    },
    url: {
      type: 'string',
      description:
        'REQUIRED. A URL to a source description to be used by a workflow. If a relative reference is used, it MUST be in the form of a URI-reference as defined by [RFC3986] Section 4.2.',
    },
  },
  required: ['name', 'type', 'url'],
  extensionsPrefix: 'x-',
  description:
    'Describes a source description (such as an AsyncAPI description) that will be referenced by one or more workflows described within an Arazzo Description.',
};

const Parameter: NodeType = {
  ...Arazzo1Types.Parameter,
  properties: {
    ...Arazzo1Types.Parameter.properties,
    in: {
      type: 'string',
      enum: ['header', 'query', 'path', 'cookie', 'querystring'],
      description:
        'The location of the parameter. Possible values are "path", "query", "querystring", "header", or "cookie". When the step in context specifies a workflowId, then all parameters map to workflow inputs. In all other scenarios (e.g., a step specifies an operationId), the in field MUST be specified.',
    },
  },
};

const Step: NodeType = {
  ...Arazzo1Types.Step,
  properties: {
    ...Arazzo1Types.Step.properties,
    channelPath: {
      type: 'string',
      description:
        'A reference to a Source Description Object combined with a JSON Pointer to reference an AsyncAPI channel. This field is mutually exclusive of the operationId, operationPath, and workflowId fields respectively. A Runtime Expression syntax MUST be used to identify the source description document.',
    },
    action: {
      type: 'string',
      enum: ['send', 'receive'],
      description:
        'Describes the intent of the message flow for an AsyncAPI operation. Possible values are "send" or "receive".',
    },
    correlationId: {
      type: 'string',
      description:
        'A Runtime Expression used to correlate a request with a response when interacting with asynchronous APIs. Applies to "receive" steps.',
    },
    timeout: {
      type: 'integer',
      minimum: 0,
      description:
        'A non-negative integer indicating the maximum amount of time (in milliseconds) to wait before timing out.',
    },
    dependsOn: {
      type: 'array',
      items: { type: 'string' },
      description:
        'A list of steps that MUST be completed before this step can be executed. Each value provided MUST be a stepId.',
    },
  },
  requiredOneOf: ['x-operation', 'operationId', 'operationPath', 'channelPath', 'workflowId'],
};

const JSONPathExpression: NodeType = {
  properties: {
    type: { type: 'string', enum: ['jsonpath'] },
    version: { type: 'string', enum: ['rfc9535', 'draft-goessner-dispatch-jsonpath-00'] },
  },
  required: ['type', 'version'],
};

const XPathExpression: NodeType = {
  properties: {
    type: { type: 'string', enum: ['xpath'] },
    version: { type: 'string', enum: ['xpath-31', 'xpath-30', 'xpath-20', 'xpath-10'] },
  },
  required: ['type', 'version'],
};

const JSONPointerExpression: NodeType = {
  properties: {
    type: { type: 'string', enum: ['jsonpointer'] },
    version: { type: 'string', enum: ['rfc6901'] },
  },
  required: ['type', 'version'],
};

const ExpressionType: NodeType = {
  properties: {
    type: {
      type: 'string',
      enum: ['jsonpath', 'xpath', 'jsonpointer'],
      description:
        'REQUIRED. The selector type. The options allowed are jsonpath, xpath, or jsonpointer.',
    },
    version: {
      type: 'string',
      description:
        'REQUIRED. A short hand string representing the version of the expression type being used.',
    },
  },
  required: ['type', 'version'],
};

const expressionTypeResolver = (value: any) => {
  if (value?.type === 'jsonpath') {
    return 'JSONPathExpression';
  } else if (value?.type === 'xpath') {
    return 'XPathExpression';
  } else if (value?.type === 'jsonpointer') {
    return 'JSONPointerExpression';
  } else {
    return 'ExpressionType';
  }
};

const CriterionObject: NodeType = {
  ...Arazzo1Types.CriterionObject,
  properties: {
    ...Arazzo1Types.CriterionObject.properties,
    type: (value: any) => {
      if (!value) {
        return undefined;
      } else if (typeof value === 'string') {
        return {
          enum: ['regex', 'jsonpath', 'simple', 'xpath'],
          description: 'The type of condition to be applied.',
        };
      } else {
        return expressionTypeResolver(value);
      }
    },
  },
};

const SelectorObject: NodeType = {
  properties: {
    context: {
      type: 'string',
      description:
        'REQUIRED. A Runtime Expression that evaluates to structured data (e.g., $response.body) the selector is applied to.',
    },
    selector: {
      type: 'string',
      description:
        'REQUIRED. The selector expression (JSONPath, XPath, or JSON Pointer) used to extract data from the context.',
    },
    type: (value: any) => {
      if (typeof value === 'string') {
        return {
          enum: ['jsonpath', 'xpath', 'jsonpointer'],
          description: 'The type of selector to be applied.',
        };
      } else {
        return expressionTypeResolver(value);
      }
    },
  },
  required: ['context', 'selector', 'type'],
  extensionsPrefix: 'x-',
  description:
    'An object used to extract specific data from structured content using JSONPath, XPath, or JSON Pointer expressions.',
};

const Outputs: NodeType = {
  properties: {},
  additionalProperties: (value: any) => {
    if (isPlainObject(value)) {
      return 'SelectorObject';
    } else {
      return { type: 'string' };
    }
  },
  description:
    'A map between a friendly name and a dynamic output value defined using a Runtime Expression or a Selector Object. The name MUST use keys that match the regular expression: ^[a-zA-Z0-9_.-]+$.',
};

const Replacement: NodeType = {
  ...Arazzo1Types.Replacement,
  properties: {
    ...Arazzo1Types.Replacement.properties,
    targetSelectorType: (value: any) => {
      if (!value) {
        return undefined;
      } else if (typeof value === 'string') {
        return {
          enum: ['jsonpath', 'xpath', 'jsonpointer'],
          description: 'The type of selector used in the target field.',
        };
      } else {
        return expressionTypeResolver(value);
      }
    },
  },
};

const SuccessActionObject: NodeType = {
  ...Arazzo1Types.SuccessActionObject,
  properties: {
    ...Arazzo1Types.SuccessActionObject.properties,
    parameters: 'Parameters',
  },
};

const FailureActionObject: NodeType = {
  ...Arazzo1Types.FailureActionObject,
  properties: {
    ...Arazzo1Types.FailureActionObject.properties,
    parameters: 'Parameters',
  },
};

export const Arazzo1_1Types: Record<string, NodeType> = {
  ...Arazzo1Types,
  Root,
  SourceDescriptions,
  AsyncAPISourceDescription,
  Parameter,
  Step,
  CriterionObject,
  JSONPathExpression,
  XPathExpression,
  JSONPointerExpression,
  ExpressionType,
  SelectorObject,
  Outputs,
  Replacement,
  SuccessActionObject,
  FailureActionObject,
};
