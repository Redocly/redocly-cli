import type { Referenced } from './openapi.js';

export interface Async2Definition {
  asyncapi: string;
  info?: Async2Info;
  id?: string;
  servers?: Record<string, Async2Server>;
  channels?: Record<string, Async2Channel>;
  components?: Async2Components;
  tags?: unknown[];
  externalDocs?: unknown;
  defaultContentType?: string;
}

export interface Async2Info {
  title: string;
  version: string;

  description?: string;
  termsOfService?: string;
  contact?: Async2Contact;
  license?: Async2License;
}

export interface Async2Contact {
  name?: string;
  url?: string;
  email?: string;
}

export interface Async2License {
  name: string;
  url?: string;
}

export interface Async2Components {
  schemas?: Record<string, unknown>;
  messages?: Record<string, unknown>;
  securitySchemes?: Record<string, Async2SecurityScheme>;
  parameters?: Record<string, unknown>;
  correlationIds?: Record<string, unknown>;
  operationTraits?: Record<string, Async2OperationTrait>;
  messageTraits?: Record<string, unknown>;
  serverBindings?: Record<string, unknown>;
  channelBindings?: Record<string, unknown>;
  operationBindings?: Record<string, unknown>;
  messageBindings?: Record<string, unknown>;
}

export type Async2SecurityRequirement = Record<string, string[]>;

export interface Async2SecurityScheme {
  type: string;
  description?: string;
  name?: string;
  in?: string;
  scheme?: string;
  bearerFormat?: string;
  openIdConnectUrl?: string;
  flows?: Record<string, unknown>;
}

export interface Async2Server {
  url: string;
  protocol: string;
  protocolVersion?: string;
  description?: string;
  variables?: Record<string, unknown>;
  security?: Async2SecurityRequirement[];
  bindings?: unknown;
}

export interface Async2Channel {
  description?: string;
  subscribe?: Async2Operation;
  publish?: Async2Operation;
  parameters?: Record<string, unknown>;
  bindings?: unknown;
  servers?: string[];
}

export interface Async2OperationTrait {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: unknown[];
  externalDocs?: unknown;
  bindings?: unknown;
  security?: Async2SecurityRequirement[];
}

export interface Async2Operation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: unknown[];
  externalDocs?: unknown;
  bindings?: unknown;
  traits?: Array<Referenced<Async2OperationTrait>>;
  message?: unknown;
  security?: Async2SecurityRequirement[];
}
