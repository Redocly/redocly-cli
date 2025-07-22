import type { Oas2Definition, Oas3_1Definition, Oas3Definition } from '@redocly/openapi-core';

export type Definition = Oas3_1Definition | Oas3Definition | Oas2Definition;
export interface ComponentsFiles {
  [schemas: string]: any;
}
export interface RefObject {
  [$ref: string]: string;
}

export const COMPONENTS = 'components';
export const PATHS = 'paths';
export const WEBHOOKS = 'webhooks';
export const xWEBHOOKS = 'x-webhooks';

export type Oas3Method = typeof OPENAPI3_METHOD_NAMES[number];
export const OPENAPI3_METHOD_NAMES = [
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
] as const;

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
