import type {
  Oas2Definition,
  Oas3Definition,
  Oas3_1Definition,
  Oas3_2Definition,
  Async2Definition,
  Async3Definition,
} from '@redocly/openapi-core';

export type Definition =
  | Oas2Definition
  | Oas3Definition
  | Oas3_1Definition
  | Oas3_2Definition
  | Async2Definition
  | Async3Definition;
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
export const CHANNELS = 'channels';
export const OPERATIONS = 'operations';

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
  'query',
] as const;

export type AsyncApiAction = typeof ASYNCAPI_ACTION_NAMES[number];
export const ASYNCAPI_ACTION_NAMES = ['send', 'receive'] as const;

export type Oas3Component = typeof OPENAPI3_COMPONENT_NAMES[number];
export const OPENAPI3_COMPONENT_NAMES = [
  'schemas',
  'responses',
  'parameters',
  'examples',
  'headers',
  'requestBodies',
  'links',
  'callbacks',
  'securitySchemes',
] as const;

export type AsyncApi2Component = typeof ASYNCAPI2_COMPONENT_NAMES[number];
export const ASYNCAPI2_COMPONENT_NAMES = [
  'schemas',
  'messages',
  'parameters',
  'correlationIds',
  'messageTraits',
  'operationTraits',
  'securitySchemes',
  'servers',
  'serverVariables',
  'channels',
  'serverBindings',
  'channelBindings',
  'operationBindings',
  'messageBindings',
] as const;

export type AsyncApi3Component = typeof ASYNCAPI3_COMPONENT_NAMES[number];
export const ASYNCAPI3_COMPONENT_NAMES = [
  'schemas',
  'messages',
  'parameters',
  'replies',
  'replyAddresses',
  'correlationIds',
  'messageTraits',
  'operationTraits',
  'tags',
  'externalDocs',
  'securitySchemes',
  'servers',
  'serverVariables',
  'channels',
  'operations',
  'serverBindings',
  'channelBindings',
  'operationBindings',
  'messageBindings',
] as const;
