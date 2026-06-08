import type { Referenced } from './openapi.js';

export interface Async3Definition {
  asyncapi: string;
  servers?: Record<string, Async3Server>;
  info: Async3Info;
  channels?: Record<string, Async3Channel>;
  components?: Async3Components;
  operations?: Record<string, Referenced<Async3Operation>>;
  defaultContentType?: string;
}

export interface Async3Info {
  title: string;
  version: string;

  description?: string;
  termsOfService?: string;
  contact?: Async3Contact;
  license?: Async3License;
  tags?: Tag[];
  externalDocs?: ExternalDoc;
}

export interface Async3Contact {
  name?: string;
  url?: string;
  email?: string;
}

export interface Async3License {
  name: string;
  url?: string;
}

export interface Tag {
  name: string;
  description?: string;
  externalDocs?: ExternalDoc;
}

export interface ExternalDoc {
  url: string;
  description?: string;
}

export interface Async3Components {
  schemas?: Record<string, unknown>;
  messages?: Record<string, unknown>;
  securitySchemes?: Record<string, Async3SecurityScheme>;
  parameters?: Record<string, unknown>;
  correlationIds?: Record<string, unknown>;
  operationTraits?: Record<string, Async3OperationTrait>;
  messageTraits?: Record<string, unknown>;
  serverBindings?: Record<string, unknown>;
  channelBindings?: Record<string, unknown>;
  operationBindings?: Record<string, unknown>;
  messageBindings?: Record<string, unknown>;
  channels?: Record<string, Async3Channel>;
  servers?: Record<string, Async3Server>;
}

export interface Async3SecurityScheme {
  type: string;
  description?: string;
  name?: string;
  in?: string;
  scheme?: string;
  bearerFormat?: string;
  openIdConnectUrl?: string;
  flows?: Record<string, unknown>;
}

export interface Async3Server {
  host: string;
  protocol: string;
  protocolVersion?: string;
  pathname?: string;
  description?: string;
  variables?: Record<string, unknown>;
  security?: Array<Referenced<Async3SecurityScheme>>;
  bindings?: unknown;
}

export interface Async3Channel {
  address?: string | null;
  messages?: Record<string, unknown>;
  title?: string;
  summary?: string;
  description?: string;
  servers?: Array<Referenced<Async3Server>>;
  parameters?: Record<string, unknown>;
  tags?: Record<string, unknown>;
  externalDocs?: ExternalDocumentation;
  bindings?: Record<string, unknown>;
}

/**
 * @deprecated Use `Async3Channel` instead.
 */
export type Channel = Async3Channel;

export interface Async3OperationTrait {
  title?: string;
  summary?: string;
  description?: string;
  tags?: unknown[];
  externalDocs?: unknown;
  bindings?: unknown;
  security?: Array<Referenced<Async3SecurityScheme>>;
}

export interface Async3Operation {
  action?: 'send' | 'receive';
  channel?: Referenced<Async3Channel>;
  title?: string;
  summary?: string;
  description?: string;
  tags?: unknown[];
  externalDocs?: unknown;
  operationId?: string;
  security?: Array<Referenced<Async3SecurityScheme>>;
  bindings?: unknown;
  traits?: Array<Referenced<Async3OperationTrait>>;
  reply?: unknown;
}

export interface ExternalDocumentation {
  url: string;
  description?: string;
}
