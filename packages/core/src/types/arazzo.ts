import { listOf, mapOf, type NodeType } from './index.js';
import { Oas3_2Types } from './oas3_2.js';

const Root: NodeType = {
  properties: {
    arazzo: {
      type: 'string',
      description:
        'REQUIRED. This string MUST be the version number of the Arazzo Specification that the Arazzo Description uses. The arazzo field MUST be used by tooling to interpret the Arazzo Description.',
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
    title: {
      type: 'string',
      description: 'REQUIRED. A human readable title of the Arazzo Description.',
    },
    description: {
      type: 'string',
      description:
        'A description of the purpose of the workflows defined. CommonMark syntax MAY be used for rich text representation.',
    },
    summary: {
      type: 'string',
      description: 'A short summary of the Arazzo Description.',
    },
    version: {
      type: 'string',
      description:
        'REQUIRED. The version identifier of the Arazzo document (which is distinct from the Arazzo Specification version).',
    },
  },
  required: ['title', 'version'],
  extensionsPrefix: 'x-',
  description:
    'The object provides metadata about API workflows defined in this Arazzo document. The metadata MAY be used by the clients if needed.',
  documentationLink: `https://spec.openapis.org/arazzo/latest.html#info-object`,
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
    name: {
      type: 'string',
      description: `REQUIRED. A unique name for the source description. Tools and libraries MAY use the name to uniquely identify a source description, therefore, it is RECOMMENDED to follow common programming naming conventions. SHOULD conform to the regular expression [A-Za-z0-9_-]+.`,
    },
    type: {
      type: 'string',
      enum: ['openapi'],
      description: 'The type of source description. Possible values are "openapi".',
    },
    url: {
      type: 'string',
      description:
        'REQUIRED. A URL to a source description to be used by a workflow. If a relative reference is used, it MUST be in the form of a URI-reference as defined by [RFC3986] Section 4.2.',
    },
    'x-serverUrl': { type: 'string' },
  },
  required: ['name', 'type', 'url'],
  extensionsPrefix: 'x-',
  description:
    'Describes a source description (such as an OpenAPI description) that will be referenced by one or more workflows described within an Arazzo Description.',
  documentationLink: 'https://spec.openapis.org/arazzo/latest.html#source-description-object',
};
const ArazzoSourceDescription: NodeType = {
  properties: {
    name: {
      type: 'string',
      description: `REQUIRED. A unique name for the source description. Tools and libraries MAY use the name to uniquely identify a source description, therefore, it is RECOMMENDED to follow common programming naming conventions. SHOULD conform to the regular expression [A-Za-z0-9_-]+.`,
    },
    type: {
      type: 'string',
      enum: ['arazzo'],
      description: 'The type of source description. Possible values are "arazzo".',
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
    'Describes a source description (such as an OpenAPI description) that will be referenced by one or more workflows described within an Arazzo Description.',
  documentationLink: 'https://spec.openapis.org/arazzo/latest.html#source-description-object',
};
const ReusableObject: NodeType = {
  properties: {
    reference: {
      type: 'string',
      description: 'REQUIRED. A Runtime Expression used to reference the desired object.',
    },
    value: {}, // any
  },
  required: ['reference'],
  extensionsPrefix: 'x-',
  documentationLink: 'https://spec.openapis.org/arazzo/latest.html#reusable-object',
  description:
    'A simple object to allow referencing of objects contained within the Components Object. It can be used from locations within steps or workflows in the Arazzo Description. Note - Input Objects MUST use standard JSON Schema referencing via the $ref keyword while all non JSON Schema objects use this object and its expression based referencing mechanism.',
};
const Parameter: NodeType = {
  properties: {
    in: {
      type: 'string',
      enum: ['header', 'query', 'path', 'cookie'],
      description:
        'The location of the parameter. Possible values are "path", "query", "header", or "cookie". When the step in context specifies a workflowId, then all parameters map to workflow inputs. In all other scenarios (e.g., a step specifies an operationId), the in field MUST be specified.',
    },
    name: {
      type: 'string',
      description: 'REQUIRED. The name of the parameter. Parameter names are case sensitive.',
    },
    value: {}, // any
  },
  required: ['name', 'value'],
  extensionsPrefix: 'x-',
  documentationLink: 'https://spec.openapis.org/arazzo/latest.html#parameter-object',
  description:
    'Describes a single step parameter. A unique parameter is defined by the combination of a name and in fields.',
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
    dependsOn: {
      type: 'array',
      items: { type: 'string' },
      description:
        'A list of workflows that MUST be completed before this workflow can be processed. Each value provided MUST be a workflowId.',
    },
    inputs: 'Schema',
    outputs: 'Outputs',
    steps: 'Steps',
    successActions: 'OnSuccessActionList',
    failureActions: 'OnFailureActionList',
    'x-security': 'ExtendedSecurityList',
  },
  required: ['workflowId', 'steps'],
  extensionsPrefix: 'x-',
  documentationLink: 'https://spec.openapis.org/arazzo/latest.html#workflow-object',
  description:
    'Describes the steps to be taken across one or more APIs to achieve an objective. The workflow object MAY define inputs needed in order to execute workflow steps, where the defined steps represent a call to an API operation or another workflow, and a set of outputs.',
};
const Workflows: NodeType = listOf('Workflow');
const Steps: NodeType = listOf('Step');
const Step: NodeType = {
  properties: {
    stepId: {
      type: 'string',
      description: `REQUIRED. Unique string to represent the step. The stepId MUST be unique amongst all steps described in the workflow. The stepId value is case-sensitive. Tools and libraries MAY use the stepId to uniquely identify a workflow step, therefore, it is RECOMMENDED to follow common programming naming conventions. SHOULD conform to the regular expression [A-Za-z0-9_-]+.`,
    },
    description: {
      type: 'string',
      description:
        'A description of the step. CommonMark syntax MAY be used for rich text representation.',
    },
    operationId: {
      type: 'string',
      description:
        'The name of an existing, resolvable operation, as defined with a unique operationId and existing within one of the sourceDescriptions. The referenced operation will be invoked by this workflow step. If multiple (non arazzo type) sourceDescriptions are defined, then the operationId MUST be specified using a Runtime Expression (e.g., $sourceDescriptions.<name>.<operationId>) to avoid ambiguity or potential clashes. This field is mutually exclusive of the operationPath and workflowId fields respectively.',
    },
    operationPath: {
      type: 'string',
      description:
        'A reference to a Source Description Object combined with a JSON Pointer to reference an operation. This field is mutually exclusive of the operationId and workflowId fields respectively. The operation being referenced MUST be described within one of the sourceDescriptions descriptions. A Runtime Expression syntax MUST be used to identify the source description document. If the referenced operation has an operationId defined then the operationId SHOULD be preferred over the operationPath.',
    },
    workflowId: {
      type: 'string',
      description:
        'The workflowId referencing an existing workflow within the Arazzo Description. If the referenced workflow is contained within an arazzo type sourceDescription, then the workflowId MUST be specified using a Runtime Expression (e.g., $sourceDescriptions.<name>.<workflowId>) to avoid ambiguity or potential clashes. The field is mutually exclusive of the operationId and operationPath fields respectively.',
    },
    parameters: 'Parameters',
    successCriteria: listOf('CriterionObject', {
      description:
        'A list of assertions to determine the success of the step. Each assertion is described using a Criterion Object. All assertions MUST be satisfied for the step to be deemed successful.',
    }),
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
  description:
    'Describes a single workflow step which MAY be a call to an API operation (OpenAPI Operation Object) or another Workflow Object.',
};
const Outputs: NodeType = {
  properties: {},
  additionalProperties: {
    type: 'string',
  },
  description:
    'A map between a friendly name and a dynamic output value defined using a Runtime Expression. The name MUST use keys that match the regular expression: ^[a-zA-Z0-9_.-]+$.',
};
const RequestBody: NodeType = {
  properties: {
    contentType: {
      type: 'string',
      description:
        'The Content-Type for the request content. If omitted then refer to Content-Type specified at the targeted operation to understand serialization requirements.',
    },
    payload: {},
    replacements: listOf('Replacement', {
      description: 'A list of locations and values to set within a payload.',
    }),
  },
  required: ['payload'],
  extensionsPrefix: 'x-',
  documentationLink: 'https://spec.openapis.org/arazzo/latest.html#request-body-object',
  description:
    'A single request body describing the Content-Type and request body content to be passed by a step to an operation.',
};
const Replacement: NodeType = {
  properties: {
    target: {
      type: 'string',
      description:
        'REQUIRED. A JSON Pointer or XPath Expression which MUST be resolved against the request body. Used to identify the location to inject the value.',
    },
    value: {},
  },
  required: ['target', 'value'],
  extensionsPrefix: 'x-',
  documentationLink: 'https://spec.openapis.org/arazzo/latest.html#payload-replacement-object',
  description:
    'Describes a location within a payload (e.g., a request body) and a value to set within the location.',
};
const ExtendedSecurity: NodeType = {
  properties: {
    schemeName: {
      type: 'string',
      description:
        'REQUIRED. Name of the security scheme from your OpenAPI specification. Use with operationId or operationPath at the step level.',
    },
    values: {},
    scheme: 'SecurityScheme',
  },
  required: ['values'],
  requiredOneOf: ['schemeName', 'scheme'],
  documentationLink: 'https://redocly.com/docs/respect/extensions/x-security#x-security-extension',
  description:
    'Use the x-security extension to define authorization flows based on OpenAPI security schemes. Respect automatically constructs appropriate authorization headers, queries, or cookies based on your parameters.',
};
const ExtendedOperation: NodeType = {
  properties: {
    url: {
      type: 'string',
      description:
        'REQUIRED. A valid url including the protocol (such as http://localhost:4000/my-api or https://example.com/api/my-api).',
    },
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
      description:
        'REQUIRED. HTTP operation method. Possible values: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS, CONNECT, TRACE. You can also use their lowercase equivalents.',
    },
  },
  required: ['url', 'method'],
  documentationLink: 'https://redocly.com/docs/respect/extensions/x-operation',
  description:
    'x-operation enables you to specify a URL and HTTP method for an operation that is not described in the Arazzo sourceDescriptions section. The primary application of the x-operation extension is to facilitate calls to third-party APIs or other endpoints that are needed in a sequence of API calls.',
};
const CriterionObject: NodeType = {
  properties: {
    condition: {
      type: 'string',
      description:
        'REQUIRED. The condition to apply. Conditions can be simple (e.g. $statusCode == 200 which applies an operator on a value obtained from a runtime expression), or a regex, or a JSONPath expression. For regex or JSONPath, the type and context MUST be specified.',
    },
    context: {
      type: 'string',
      description:
        'A Runtime Expression used to set the context for the condition to be applied on. If type is specified, then the context MUST be provided (e.g. $response.body would set the context that a JSONPath query expression could be applied to).',
    },
    type: (value: any) => {
      if (!value) {
        return undefined;
      } else if (typeof value === 'string') {
        return {
          enum: ['regex', 'jsonpath', 'simple', 'xpath'],
          description: 'The type of condition to be applied.',
        };
      } else if (value?.type === 'jsonpath') {
        return 'JSONPathCriterion';
      } else {
        return 'XPathCriterion';
      }
    },
  },
  required: ['condition'],
  documentationLink: 'https://spec.openapis.org/arazzo/latest.html#criterion-object',
  description:
    'An object used to specify the context, conditions, and condition types that can be used to prove or satisfy assertions specified in Step Object successCriteria, Success Action Object criteria, and Failure Action Object criteria.',
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
    name: {
      type: 'string',
      description: 'REQUIRED. The name of the success action. Names are case sensitive.',
    },
    type: {
      type: 'string',
      enum: ['goto', 'end'],
      description: 'REQUIRED. The type of action to take. Possible values are "end" or "goto".',
    },
    stepId: {
      type: 'string',
      description:
        'The stepId to transfer to upon success of the step. This field is only relevant when the type field value is "goto". The referenced stepId MUST be within the current workflow. This field is mutually exclusive to workflowId.',
    },
    workflowId: {
      type: 'string',
      description:
        'The workflowId referencing an existing workflow within the Arazzo Description to transfer to upon success of the step. This field is only relevant when the type field value is "goto". If the referenced workflow is contained within an arazzo type sourceDescription, then the workflowId MUST be specified using a Runtime Expression (e.g., $sourceDescriptions.<name>.<workflowId>) to avoid ambiguity or potential clashes. This field is mutually exclusive to stepId.',
    },
    criteria: listOf('CriterionObject', {
      description:
        'A list of assertions to determine if this action SHALL be executed. Each assertion is described using a Criterion Object. All criteria assertions MUST be satisfied for the action to be executed.',
    }),
  },
  required: ['type', 'name'],
  documentationLink: 'https://spec.openapis.org/arazzo/latest.html#success-action-object',
  description:
    'A single success action which describes an action to take upon success of a workflow step.',
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
    name: {
      type: 'string',
      description: 'REQUIRED. The name of the failure action. Names are case sensitive.',
    },
    type: {
      type: 'string',
      enum: ['goto', 'retry', 'end'],
      description:
        'REQUIRED. The type of action to take. Possible values are "end", "retry", or "goto".',
    },
    workflowId: {
      type: 'string',
      description:
        'The workflowId referencing an existing workflow within the Arazzo Description to transfer to upon failure of the step. This field is only relevant when the type field value is "goto" or "retry". If the referenced workflow is contained within an arazzo type sourceDescription, then the workflowId MUST be specified using a Runtime Expression (e.g., $sourceDescriptions.<name>.<workflowId>) to avoid ambiguity or potential clashes. This field is mutually exclusive to stepId. When used with "retry", context transfers back upon completion of the specified workflow.',
    },
    stepId: {
      type: 'string',
      description:
        'The stepId to transfer to upon failure of the step. This field is only relevant when the type field value is "goto" or "retry". The referenced stepId MUST be within the current workflow. This field is mutually exclusive to workflowId. When used with "retry", context transfers back upon completion of the specified step.',
    },
    retryAfter: {
      type: 'number',
      minimum: 0,
      description:
        'A non-negative decimal indicating the seconds to delay after the step failure before another attempt SHALL be made. Note: if an HTTP Retry-After response header was returned to a step from a targeted operation, then it SHOULD overrule this particular field value. This field only applies when the type field value is "retry".',
    },
    retryLimit: {
      type: 'number',
      minimum: 0,
      description:
        'A non-negative integer indicating how many attempts to retry the step MAY be attempted before failing the overall step. If not specified then a single retry SHALL be attempted. This field only applies when the type field value is "retry". The retryLimit MUST be exhausted prior to executing subsequent failure actions.',
    },
    criteria: listOf('CriterionObject', {
      description:
        'A list of assertions to determine if this action SHALL be executed. Each assertion is described using a Criterion Object.',
    }),
  },
  required: ['type', 'name'],
  documentationLink: 'https://spec.openapis.org/arazzo/latest.html#failure-action-object',
  description:
    'A single failure action which describes an action to take upon failure of a workflow step.',
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
