import type {
  Oas3SecurityScheme,
  ApiKeyAuth,
  BasicAuth,
  BearerAuth,
  OpenIDAuth,
  OAuth2Auth,
  MutualTLSAuth,
} from './openapi.js';

export interface InfoObject {
  title: string;
  description?: string;
  summary?: string;
  version: string;
}

export interface OpenAPISourceDescription {
  name: string;
  type: 'openapi';
  url: string;
  'x-serverUrl'?: string;
}

export interface ArazzoSourceDescription {
  name: string;
  type: 'arazzo';
  url: string;
}

export interface AsyncAPISourceDescription {
  name: string;
  type: 'asyncapi';
  url: string;
}

export type SourceDescription =
  | OpenAPISourceDescription
  | ArazzoSourceDescription
  | AsyncAPISourceDescription; // added in Arazzo 1.1

export interface Parameter {
  in?:
    | 'header'
    | 'query'
    | 'querystring' // added in Arazzo 1.1
    | 'path'
    | 'cookie';
  name: string;
  value: string | number | boolean;
  reference?: string;
}

export type ExtendedSecurity =
  | {
      schemeName: string;
      values: Record<string, string>;
    }
  | {
      scheme: Oas3SecurityScheme;
      values: Record<string, string>;
    };

export type ResolvedSecurity =
  | {
      scheme: ApiKeyAuth;
      values: {
        apiKey: string;
      };
    }
  | {
      scheme: BasicAuth;
      values: {
        username: string;
        password: string;
      };
    }
  | {
      scheme: BearerAuth;
      values: {
        token: string;
      };
    }
  | {
      scheme: OAuth2Auth;
      values: {
        accessToken: string;
      };
    }
  | {
      scheme: OpenIDAuth;
      values: {
        accessToken: string;
      };
    }
  | {
      scheme: MutualTLSAuth;
      values: Record<string, unknown>;
    };

export interface ExtendedOperation {
  url: string;
  method:
    | 'get'
    | 'post'
    | 'put'
    | 'delete'
    | 'patch'
    | 'head'
    | 'options'
    | 'trace'
    | 'connect'
    | 'query'
    | 'GET'
    | 'POST'
    | 'PUT'
    | 'DELETE'
    | 'PATCH'
    | 'HEAD'
    | 'OPTIONS'
    | 'TRACE'
    | 'CONNECT'
    | 'QUERY';
}

export interface Replacement {
  target: string;
  value: string | object | any[];
  targetSelectorType?: ExpressionType['type'] | ExpressionType; // added in Arazzo 1.1
}

export interface RequestBody {
  contentType?: string;
  payload: string | object | any[];
  encoding?: string;
  replacements?: Replacement[];
}

export interface CriterionObject {
  condition: string;
  context?: string;
  type?:
    | 'regex'
    | 'jsonpath'
    | 'simple'
    | 'xpath'
    | {
        type: 'jsonpath';
        version: 'draft-goessner-dispatch-jsonpath-00' | 'rfc9535';
      }
    | {
        type: 'xpath';
        version: 'xpath-31' | 'xpath-30' | 'xpath-20' | 'xpath-10';
      };
}

export type ExpressionType =
  | {
      type: 'jsonpath';
      version: 'rfc9535' | 'draft-goessner-dispatch-jsonpath-00';
    }
  | {
      type: 'xpath';
      version: 'xpath-31' | 'xpath-30' | 'xpath-20' | 'xpath-10';
    }
  | {
      type: 'jsonpointer';
      version: 'rfc6901';
    };

export interface SelectorObject {
  context: string;
  selector: string;
  type: ExpressionType['type'] | ExpressionType;
}

export interface OnSuccessObject {
  name: string;
  type: 'goto' | 'end';
  stepId?: string;
  workflowId?: string;
  criteria?: CriterionObject[];
  parameters?: Parameter[]; // added in Arazzo 1.1
}

export interface OnFailureObject {
  name: string;
  type: 'goto' | 'retry' | 'end';
  workflowId?: string;
  stepId?: string;
  retryAfter?: number;
  retryLimit?: number;
  criteria?: CriterionObject[];
  parameters?: Parameter[]; // added in Arazzo 1.1
}

export interface Step {
  stepId: string;
  description?: string;
  operationId?: string;
  operationPath?: string;
  workflowId?: string;
  parameters?: Parameter[];
  successCriteria?: CriterionObject[];
  onSuccess?: OnSuccessObject[];
  onFailure?: OnFailureObject[];
  outputs?: {
    [key: string]:
      | SelectorObject // added in Arazzo 1.1
      | string
      | object
      | any[]
      | boolean
      | number;
  };
  'x-operation'?: ExtendedOperation;
  'x-security'?: ExtendedSecurity[];
  requestBody?: RequestBody;
  channelPath?: string; // added in Arazzo 1.1
  action?: 'send' | 'receive'; // added in Arazzo 1.1
  correlationId?: string; // added in Arazzo 1.1
  timeout?: number; // added in Arazzo 1.1
  dependsOn?: string[]; // added in Arazzo 1.1
}

export interface Workflow {
  workflowId: string;
  summary?: string;
  description?: string;
  parameters?: Parameter[];
  dependsOn?: string[];
  inputs?: {
    type: 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean' | 'null';
    properties?: {
      [key: string]: any;
    };
    required?: string[];
    items?: {
      [key: string]: any;
    };
  };
  outputs?: {
    [key: string]:
      | SelectorObject // added in Arazzo 1.1
      | string;
  };
  steps: Step[];
  successActions?: OnSuccessObject[];
  failureActions?: OnFailureObject[];
  'x-security'?: ExtendedSecurity[];
}

export interface ArazzoDefinition {
  arazzo: string;
  $self?: string; // added in Arazzo 1.1
  info: InfoObject;
  sourceDescriptions: SourceDescription[];
  workflows: Workflow[];
  components?: {
    inputs?: {
      [key: string]: {
        type: string;
        properties?: {
          [key: string]: any;
        };
      };
    };
    parameters?: {
      [key: string]: Parameter;
    };
    successActions?: {
      [key: string]: OnSuccessObject;
    };
    failureActions?: {
      [key: string]: OnFailureObject;
    };
  };
}
