export type Async3Definition = {
  asyncapi: string;
  servers?: Record<string, Async3Server>;
  info: Async3Info;
  channels?: Record<string, Channel>;
  components?: Record<string, any>;
  operations?: Record<string, Async3Operation>;
  defaultContentType?: string;
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

export interface Async3Server {
  host: string;
  protocol: string;
  protocolVersion?: string;
  pathname?: string;
  description?: string;
  variables?: Record<string, unknown>;
  security?: Array<Async3SecurityScheme>;
  bindings?: unknown;
}

export interface Async3Channel {
  address?: string | null;
  messages?: Record<string, unknown>;
  title?: string;
  summary?: string;
  description?: string;
  servers?: Array<Async3Server>;
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
  security?: Array<Async3SecurityScheme>;
}

export interface Async3Operation {
  action?: 'send' | 'receive';
  channel?: Async3Channel;
  title?: string;
  summary?: string;
  description?: string;
  tags?: Tag[];
  externalDocs?: ExternalDoc;
  operationId?: string;
  security?: Array<Async3SecurityScheme>;
  bindings?: unknown;
  traits?: Array<Async3OperationTrait>;
  reply?: unknown;

  'x-send-operations'?: string[]; // internal type
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

export type Async3OAuth2Flow = {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  availableScopes?: Record<string, string>;
};

export type Async3SecurityScheme = {
  type:
    | 'userPassword'
    | 'apiKey'
    | 'X509'
    | 'symmetricEncryption'
    | 'asymmetricEncryption'
    | 'httpApiKey'
    | 'http'
    | 'oauth2'
    | 'openIdConnect'
    | 'plain'
    | 'scramSha256'
    | 'scramSha512'
    | 'gssapi';
  description?: string;
  name?: string;
  in?: string;
  scheme?: string;
  bearerFormat?: string;
  flows?: {
    implicit?: Async3OAuth2Flow;
    password?: Async3OAuth2Flow;
    clientCredentials?: Async3OAuth2Flow;
    authorizationCode?: Async3OAuth2Flow;
  };
  openIdConnectUrl?: string;
  scopes?: string[];
};
