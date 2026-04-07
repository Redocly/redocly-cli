export interface OpenRpc1Definition {
  openrpc: string;
  info: OpenRpc1Info;
  servers?: OpenRpc1Server[];
  methods: (OpenRpc1Method | OpenRpc1Reference)[];
  components?: OpenRpc1Components;
  externalDocs?: OpenRpc1ExternalDocs;
}

export interface OpenRpc1Info {
  title: string;
  description?: string;
  termsOfService?: string;
  contact?: OpenRpc1Contact;
  license?: OpenRpc1License;
  version: string;
}

export interface OpenRpc1Contact {
  name?: string;
  url?: string;
  email?: string;
}

export interface OpenRpc1License {
  name: string;
  url?: string;
}

export interface OpenRpc1Server {
  url: string;
  name?: string;
  description?: string;
  summary?: string;
  variables?: Record<string, OpenRpc1ServerVariable>;
}

export interface OpenRpc1ServerVariable {
  enum?: string[];
  default: string;
  description?: string;
}

export interface OpenRpc1Method {
  name: string;
  tags?: (OpenRpc1Tag | OpenRpc1Reference)[];
  summary?: string;
  description?: string;
  externalDocs?: OpenRpc1ExternalDocs;
  params: (OpenRpc1ContentDescriptor | OpenRpc1Reference)[];
  result?: OpenRpc1ContentDescriptor | OpenRpc1Reference;
  deprecated?: boolean;
  servers?: OpenRpc1Server[];
  errors?: (OpenRpc1Error | OpenRpc1Reference)[];
  links?: (OpenRpc1Link | OpenRpc1Reference)[];
  paramStructure?: 'by-name' | 'by-position' | 'either';
  examples?: (OpenRpc1ExamplePairing | OpenRpc1Reference)[];
}

export interface OpenRpc1ContentDescriptor {
  name: string;
  summary?: string;
  description?: string;
  required?: boolean;
  schema: any; // Schema
  deprecated?: boolean;
}

export interface OpenRpc1ExamplePairing {
  name?: string;
  description?: string;
  summary?: string;
  params: (OpenRpc1Example | OpenRpc1Reference)[];
  result?: OpenRpc1Example | OpenRpc1Reference;
}

export interface OpenRpc1Example {
  name?: string;
  summary?: string;
  description?: string;
  value?: any;
  externalValue?: string;
}

export interface OpenRpc1Link {
  name: string;
  description?: string;
  summary?: string;
  method?: string;
  params?: any;
  server?: OpenRpc1Server;
}

export interface OpenRpc1Error {
  code: number;
  message: string;
  data?: any;
}

export interface OpenRpc1Components {
  contentDescriptors?: Record<string, OpenRpc1ContentDescriptor>;
  schemas?: Record<string, any>;
  examples?: Record<string, OpenRpc1Example>;
  links?: Record<string, OpenRpc1Link>;
  errors?: Record<string, OpenRpc1Error>;
  examplePairingObjects?: Record<string, OpenRpc1ExamplePairing>;
  tags?: Record<string, OpenRpc1Tag>;
}

export interface OpenRpc1Tag {
  name: string;
  summary?: string;
  description?: string;
  externalDocs?: OpenRpc1ExternalDocs;
}

export interface OpenRpc1ExternalDocs {
  description?: string;
  url: string;
}

export interface OpenRpc1Reference {
  $ref: string;
}
