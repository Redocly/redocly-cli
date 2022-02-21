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
  Referenced
} from "@redocly/openapi-core";
export { Oas3_1Definition, Oas3Definition, Oas2Definition, Oas3Components, Oas3Paths, Oas3PathItem, Oas3ComponentName, Oas3_1Schema, Oas3Schema, Oas3_1Webhooks, Referenced }
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

enum OPENAPI3_METHOD {
  Get = 'get',
  Put = 'put',
  Post = 'post',
  Delete = 'delete',
  Options = 'options',
  Head = 'head',
  Patch = 'patch',
  Trace = 'trace'
}

export const OPENAPI3_METHOD_NAMES: OPENAPI3_METHOD[] = [
  OPENAPI3_METHOD.Get,
  OPENAPI3_METHOD.Put,
  OPENAPI3_METHOD.Post,
  OPENAPI3_METHOD.Delete,
  OPENAPI3_METHOD.Options,
  OPENAPI3_METHOD.Head,
  OPENAPI3_METHOD.Patch,
  OPENAPI3_METHOD.Trace
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
  SecuritySchemes = 'securitySchemes'
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
  OPENAPI3_COMPONENT.SecuritySchemes
];
