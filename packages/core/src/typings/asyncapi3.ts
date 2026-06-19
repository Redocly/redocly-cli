import type { Referenced } from './openapi.js';

export type Async3Definition = {
  asyncapi: string;
  servers?: Record<string, Referenced<Async3Server>>;
  info: Async3Info;
  channels?: Record<string, Channel>;
  components?: Record<string, any>;
  operations?: Record<string, Async3Operation>;
  defaultContentType?: string;
};

export type Async3Operation = {
  action: 'send' | 'receive';
  channel: Channel;
  title?: string;
  summary?: string;
  description?: string;
  security?: Record<string, any>[];
  tags?: Tag[];
  externalDocs?: ExternalDocumentation;
  bindings?: Record<string, any>;
  traits?: Record<string, any>[];
  messages?: Record<string, any>[];
  reply?: Record<string, any>;

  'x-send-operations'?: string[]; // internal type
};

export interface Async3Info {
  title: string;
  version: string;

  description?: string;
  termsOfService?: string;
  contact?: Async3Contact;
  license?: Async3License;
  tags?: Tag[];
  externalDocs?: ExternalDoc;

  'x-deprecated-payload-format'?: boolean; // internal type
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
  servers?: Record<string, Referenced<Async3Server>>;
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
  tags?: Tag[];
  externalDocs?: ExternalDocumentation;
  bindings?: ChannelBindings;
}

/**
 * @deprecated Use `Async3Channel` instead.
 */
export type Channel = Async3Channel;

export interface Async3OperationTrait {
  title?: string;
  summary?: string;
  description?: string;
  tags?: Tag[];
  externalDocs?: ExternalDoc;
  bindings?: unknown;
  security?: Array<Referenced<Async3SecurityScheme>>;
}

export interface Async3Operation {
  action?: 'send' | 'receive';
  channel?: Referenced<Async3Channel>;
  title?: string;
  summary?: string;
  description?: string;
  tags?: Tag[];
  externalDocs?: ExternalDoc;
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

export type ChannelBindings = {
  amqp?: AmqpChannelBinding;
} & Record<string, Record<string, any> | undefined>;

export type AmqpChannelBinding = {
  is?: 'queue' | 'routingKey';
  exchange?: AmqpChannelBindingExchange;
  queue?: AmqpChannelBindingQueue;
  bindingVersion?: string;
};

export type AmqpChannelBindingQueue = {
  name?: string;
  durable?: boolean;
  exclusive?: boolean;
  autoDelete?: boolean;
  vhost?: string;
};

export type AmqpChannelBindingExchange = {
  name?: string;
  type?: 'topic' | 'direct' | 'fanout' | 'default' | 'headers';
  durable?: boolean;
  autoDelete?: boolean;
  vhost?: string;
};
