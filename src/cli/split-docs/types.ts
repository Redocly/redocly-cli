import {
  Oas3Definition,
  Oas3Components,
  Oas3PathItem,
  Oas3Paths,
} from '../../typings/openapi';
import { Oas2Definition } from '../../typings/swagger';
export { Oas3Definition, Oas2Definition, Oas3Components, Oas3Paths, Oas3PathItem }
export type Definition = Oas3Definition | Oas2Definition;
export interface ComponentsFiles {
  [schemas: string]: any;
}
export interface refObj {
  [$ref: string]: string;
}

export type ComponentType = {
  name: string
  data: any
}

export const COMPONENTS = 'components';
export const PATHS = 'paths';

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

export const OPENAPI3_METHODS: OPENAPI3_METHOD[] = [
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

export const OPENAPI3_COMPONENTS: OPENAPI3_COMPONENT[] = [
  OPENAPI3_COMPONENT.Schemas,
  OPENAPI3_COMPONENT.Responses,
  OPENAPI3_COMPONENT.Parameters,
  OPENAPI3_COMPONENT.Examples,
  OPENAPI3_COMPONENT.Headers,
  OPENAPI3_COMPONENT.RequestBodies,
  OPENAPI3_COMPONENT.Links,
  OPENAPI3_COMPONENT.Callbacks,
  OPENAPI3_COMPONENT.SecuritySchemes
];
