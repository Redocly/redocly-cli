export type Async3Definition = {
  asyncapi: string;
  servers?: Record<string, any>;
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

export type Channel = {
  address?: string | null;
  messages?: Record<string, any>;
  title?: string;
  summary?: string;
  description?: string;
  servers?: Record<string, any>[];
  parameters?: Record<string, any>;
  tags?: Record<string, any>;
  externalDocs?: ExternalDocumentation;
  bindings?: ChannelBindings;
};

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
