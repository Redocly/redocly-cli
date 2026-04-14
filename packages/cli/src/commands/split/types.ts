import type {
  Oas2Definition,
  Oas3Definition,
  Oas3_1Definition,
  Oas3_2Definition,
  Async2Definition,
  Async3Definition,
} from '@redocly/openapi-core';

import type { VerifyConfigOptions } from '../../types.js';
import type {
  ASYNCAPI2_COMPONENT_NAMES,
  ASYNCAPI2_SPLITTABLE_COMPONENT_NAMES,
  ASYNCAPI3_COMPONENT_NAMES,
  ASYNCAPI3_SPLITTABLE_COMPONENT_NAMES,
  ASYNCAPI_ACTION_NAMES,
} from './asyncapi/constants.js';
import type { OPENAPI3_METHOD_NAMES, OPENAPI3_COMPONENT_NAMES } from './oas/constants.js';

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

export type ChannelsFiles = Record<string, string>;
export interface RefObject {
  [$ref: string]: string;
}

export type Oas3Method = (typeof OPENAPI3_METHOD_NAMES)[number];
export type Oas3Component = (typeof OPENAPI3_COMPONENT_NAMES)[number];

export type AsyncApiAction = (typeof ASYNCAPI_ACTION_NAMES)[number];
export type AsyncApi2Component = (typeof ASYNCAPI2_COMPONENT_NAMES)[number];
export type AsyncApi2SplittableComponent = (typeof ASYNCAPI2_SPLITTABLE_COMPONENT_NAMES)[number];

export type AsyncApi3Component = (typeof ASYNCAPI3_COMPONENT_NAMES)[number];
export type AsyncApi3SplittableComponent = (typeof ASYNCAPI3_SPLITTABLE_COMPONENT_NAMES)[number];

export type AnyOas3Definition = Oas3Definition | Oas3_1Definition | Oas3_2Definition;
export type AnyAsyncApiDefinition = Async2Definition | Async3Definition;
export type AnyDefinition = AnyOas3Definition | AnyAsyncApiDefinition;

export type SplitArgv = {
  api: string;
  outDir: string;
  separator: string;
} & VerifyConfigOptions;
