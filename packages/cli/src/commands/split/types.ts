import {
  Oas3Schema,
  Oas3_1Schema,
  Oas3Definition,
  Oas3_1Definition,
  Oas3Components,
  Oas3PathItem,
  Oas3Paths,
  Oas3ComponentName,
  Oas3_1Webhooks,
  Oas2Definition,
  Referenced,
} from '@redocly/openapi-core';
export {
  Oas3_1Definition,
  Oas3Definition,
  Oas2Definition,
  Oas3Components,
  Oas3Paths,
  Oas3PathItem,
  Oas3ComponentName,
  Oas3_1Schema,
  Oas3Schema,
  Oas3_1Webhooks,
  Referenced,
};
export type Definition = Oas3_1Definition | Oas3Definition | Oas2Definition;
export interface ComponentsFiles {
  [schemas: string]: any;
}
export interface refObj {
  [$ref: string]: string;
}

export const COMPONENTS = 'components';
export const PATHS = 'paths';
export const WEBHOOKS = 'webhooks';
export const xWEBHOOKS = 'x-webhooks';
export const componentsPath = `#/${COMPONENTS}/`;

export enum OPENAPI3_METHOD {
  get = 'get',
  put = 'put',
  post = 'post',
  delete = 'delete',
  options = 'options',
  head = 'head',
  patch = 'patch',
  trace = 'trace',
}

export const OPENAPI3_METHOD_NAMES: OPENAPI3_METHOD[] = [
  OPENAPI3_METHOD.get,
  OPENAPI3_METHOD.put,
  OPENAPI3_METHOD.post,
  OPENAPI3_METHOD.delete,
  OPENAPI3_METHOD.options,
  OPENAPI3_METHOD.head,
  OPENAPI3_METHOD.patch,
  OPENAPI3_METHOD.trace,
];

export enum OPENAPI3_COMPONENT {
  Schemas = 'schemas',
  Responses = 'responses',
  Parameters = 'parameters',
  Examples = 'examples',
  Headers = 'headers',
  RequestBodies = 'requestBodies',
  Links = 'links',
  Callbacks = 'callbacks',
  SecuritySchemes = 'securitySchemes',
}

export const OPENAPI3_COMPONENT_NAMES: OPENAPI3_COMPONENT[] = [
  OPENAPI3_COMPONENT.RequestBodies,
  OPENAPI3_COMPONENT.Schemas,
  OPENAPI3_COMPONENT.Responses,
  OPENAPI3_COMPONENT.Parameters,
  OPENAPI3_COMPONENT.Examples,
  OPENAPI3_COMPONENT.Headers,
  OPENAPI3_COMPONENT.Links,
  OPENAPI3_COMPONENT.Callbacks,
  OPENAPI3_COMPONENT.SecuritySchemes,
];
