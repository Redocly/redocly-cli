export type OAS3Any = OAS3Definition | OAS3Info | OAS3Server | OAS3License | OAS3Contact; // TODO;

export enum OAS3NodeType {
  Definition,
  Info,
  Server,
  License,
  Contact,
}

export interface OAS3Definition {
  openapi: string;
  info?: OAS3Info;
  servers?: OAS3Server[];
  paths?: OAS3Paths;
  components?: OAS3Components;
  security?: OAS3SecurityRequirement[];
  tags?: OAS3Tag[];
  externalDocs?: OAS3ExternalDocs;
}

export interface OAS3Info {
  title: string;
  version: string;

  description?: string;
  termsOfService?: string;
  contact?: OAS3Contact;
  license?: OAS3License;
}

export interface OAS3Server {
  url: string;
  description?: string;
  variables?: { [name: string]: OAS3ServerVariable };
}

export interface OAS3ServerVariable {
  enum?: string[];
  default: string;
  description?: string;
}

export interface OAS3Paths {
  [path: string]: OAS3PathItem;
}
export interface OASRef {
  $ref: string;
}

export type Referenced<T> = OASRef | T;

export interface OAS3PathItem {
  summary?: string;
  description?: string;
  get?: OAS3Operation;
  put?: OAS3Operation;
  post?: OAS3Operation;
  delete?: OAS3Operation;
  options?: OAS3Operation;
  head?: OAS3Operation;
  patch?: OAS3Operation;
  trace?: OAS3Operation;
  servers?: OAS3Server[];
  parameters?: Array<Referenced<OAS3Parameter>>;
}

export interface OAS3XCodeSample {
  lang: string;
  label?: string;
  source: string;
}

export interface OAS3Operation {
  tags?: string[];
  summary?: string;
  description?: string;
  externalDocs?: OAS3ExternalDocs;
  operationId?: string;
  parameters?: Array<Referenced<OAS3Parameter>>;
  requestBody?: Referenced<OAS3RequestBody>;
  responses: OAS3Responses;
  callbacks?: { [name: string]: Referenced<OAS3Callback> };
  deprecated?: boolean;
  security?: OAS3SecurityRequirement[];
  servers?: OAS3Server[];
  'x-codeSamples'?: OAS3XCodeSample[];
  'x-code-samples'?: OAS3XCodeSample[]; // deprecated
}

export interface OAS3Parameter {
  name: string;
  in?: OAS3ParameterLocation;
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  style?: OAS3ParameterStyle;
  explode?: boolean;
  allowReserved?: boolean;
  schema?: Referenced<OAS3Schema>;
  example?: any;
  examples?: { [media: string]: Referenced<OAS3Example> };
  content?: { [media: string]: OAS3MediaType };
}

export interface OAS3Example {
  value: any;
  summary?: string;
  description?: string;
  externalValue?: string;
}

export interface OAS3Xml {
  name?: string;
  namespace?: string;
  prefix?: string;
  attribute?: string;
  wrapped?: string;
}

export interface OAS3Schema {
  $ref?: string;
  type?: string;
  properties?: { [name: string]: OAS3Schema };
  additionalProperties?: boolean | OAS3Schema;
  description?: string;
  default?: any;
  items?: OAS3Schema;
  required?: string[];
  readOnly?: boolean;
  writeOnly?: boolean;
  deprecated?: boolean;
  format?: string;
  externalDocs?: OAS3ExternalDocs;
  discriminator?: OAS3Discriminator;
  nullable?: boolean;
  oneOf?: OAS3Schema[];
  anyOf?: OAS3Schema[];
  allOf?: OAS3Schema[];
  not?: OAS3Schema;

  title?: string;
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: boolean;
  minimum?: number;
  exclusiveMinimum?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  maxProperties?: number;
  minProperties?: number;
  enum?: any[];
  example?: any;

  xml?: OAS3Xml;
}

export interface OAS3Discriminator {
  propertyName: string;
  mapping?: { [name: string]: string };
  'x-explicitMappingOnly'?: boolean;
}

export interface OAS3MediaType {
  schema?: Referenced<OAS3Schema>;
  example?: any;
  examples?: { [name: string]: Referenced<OAS3Example> };
  encoding?: { [field: string]: OAS3Encoding };
}

export interface OAS3Encoding {
  contentType: string;
  headers?: { [name: string]: Referenced<OAS3Header> };
  style: OAS3ParameterStyle;
  explode: boolean;
  allowReserved: boolean;
}

export type OAS3ParameterLocation = 'query' | 'header' | 'path' | 'cookie';
export type OAS3ParameterStyle =
  | 'matrix'
  | 'label'
  | 'form'
  | 'simple'
  | 'spaceDelimited'
  | 'pipeDelimited'
  | 'deepObject';

export interface OAS3RequestBody {
  description?: string;
  required?: boolean;
  content: { [mime: string]: OAS3MediaType };
}

export interface OAS3Responses {
  [code: string]: OAS3Response;
}

export interface OAS3Response {
  description?: string;
  headers?: { [name: string]: Referenced<OAS3Header> };
  content?: { [mime: string]: OAS3MediaType };
  links?: { [name: string]: Referenced<OAS3Link> };
}

export interface OAS3Link {
  $ref?: string;
}

export type OAS3Header = Omit<OAS3Parameter, 'in' | 'name'>;

export interface OAS3Callback {
  [name: string]: OAS3PathItem;
}

export interface OAS3Components {
  schemas?: { [name: string]: Referenced<OAS3Schema> };
  responses?: { [name: string]: Referenced<OAS3Response> };
  parameters?: { [name: string]: Referenced<OAS3Parameter> };
  examples?: { [name: string]: Referenced<OAS3Example> };
  requestBodies?: { [name: string]: Referenced<OAS3RequestBody> };
  headers?: { [name: string]: Referenced<OAS3Header> };
  securitySchemes?: { [name: string]: Referenced<OAS3SecurityScheme> };
  links?: { [name: string]: Referenced<OAS3Link> };
  callbacks?: { [name: string]: Referenced<OAS3Callback> };
}

export interface OAS3SecurityRequirement {
  [name: string]: string[];
}

export interface OAS3SecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  description?: string;
  name?: string;
  in?: 'query' | 'header' | 'cookie';
  scheme?: string;
  bearerFormat: string;
  flows: {
    implicit?: {
      refreshUrl?: string;
      scopes: Record<string, string>;
      authorizationUrl: string;
    };
    password?: {
      refreshUrl?: string;
      scopes: Record<string, string>;
      tokenUrl: string;
    };
    clientCredentials?: {
      refreshUrl?: string;
      scopes: Record<string, string>;
      tokenUrl: string;
    };
    authorizationCode?: {
      refreshUrl?: string;
      scopes: Record<string, string>;
      tokenUrl: string;
    };
  };
  openIdConnectUrl?: string;
}

export interface OAS3Tag {
  name: string;
  description?: string;
  externalDocs?: OAS3ExternalDocs;
  'x-displayName'?: string;
}

export interface OAS3ExternalDocs {
  description?: string;
  url: string;
}

export interface OAS3Contact {
  name?: string;
  url?: string;
  email?: string;
}

export interface OAS3License {
  name: string;
  url?: string;
}
