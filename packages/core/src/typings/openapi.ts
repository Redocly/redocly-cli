export interface Oas3Definition {
  openapi: string;
  info?: Oas3Info;
  servers?: Oas3Server[];
  paths?: Oas3Paths;
  components?: Oas3Components;
  security?: Oas3SecurityRequirement[];
  tags?: Oas3Tag[];
  externalDocs?: Oas3ExternalDocs;
  'x-webhooks'?: Oas3_1Webhooks;
}

export interface Oas3Info {
  title: string;
  version: string;

  description?: string;
  termsOfService?: string;
  contact?: Oas3Contact;
  license?: Oas3License;
}

export interface Oas3Server {
  url: string;
  description?: string;
  variables?: { [name: string]: Oas3ServerVariable };
}

export interface Oas3ServerVariable {
  enum?: string[];
  default: string;
  description?: string;
}

export interface Oas3Paths {
  [path: string]: Referenced<Oas3PathItem>;
}
export interface OasRef {
  $ref: string;
}

export type Referenced<T> = OasRef | T;

export interface Oas3PathItem {
  summary?: string;
  description?: string;
  get?: Oas3Operation;
  put?: Oas3Operation;
  post?: Oas3Operation;
  delete?: Oas3Operation;
  options?: Oas3Operation;
  head?: Oas3Operation;
  patch?: Oas3Operation;
  trace?: Oas3Operation;
  servers?: Oas3Server[];
  parameters?: Array<Referenced<Oas3Parameter>>;
}

export interface Oas3XCodeSample {
  lang: string;
  label?: string;
  source: string;
}

export interface Oas3Operation {
  tags?: string[];
  summary?: string;
  description?: string;
  externalDocs?: Oas3ExternalDocs;
  operationId?: string;
  parameters?: Array<Referenced<Oas3Parameter>>;
  requestBody?: Referenced<Oas3RequestBody>;
  responses: Oas3Responses;
  callbacks?: { [name: string]: Referenced<Oas3Callback> };
  deprecated?: boolean;
  security?: Oas3SecurityRequirement[];
  servers?: Oas3Server[];
  'x-codeSamples'?: Oas3XCodeSample[];
  'x-code-samples'?: Oas3XCodeSample[]; // deprecated
  'x-hideTryItPanel'?: boolean;
}

export interface Oas3Parameter {
  name: string;
  in?: Oas3ParameterLocation;
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  style?: Oas3ParameterStyle;
  explode?: boolean;
  allowReserved?: boolean;
  schema?: Referenced<Oas3Schema>;
  example?: unknown;
  examples?: { [media: string]: Referenced<Oas3Example> };
  content?: { [media: string]: Oas3MediaType };
}

export interface Oas3Example {
  value: unknown;
  summary?: string;
  description?: string;
  externalValue?: string;
}

export interface Oas3Xml {
  name?: string;
  namespace?: string;
  prefix?: string;
  attribute?: string;
  wrapped?: string;
}

// common fields for OpenAPI Schema v3.x
interface Oas3XSchemaBase {
  $ref?: string;
  description?: string;
  default?: unknown;
  required?: string[];
  readOnly?: boolean;
  writeOnly?: boolean;
  deprecated?: boolean;
  format?: string;
  externalDocs?: Oas3ExternalDocs;
  discriminator?: Oas3Discriminator;
  nullable?: boolean;

  title?: string;
  multipleOf?: number;
  maximum?: number;
  minimum?: number;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  maxProperties?: number;
  minProperties?: number;
  enum?: unknown[];
  example?: unknown;

  xml?: Oas3Xml;
  'x-tags'?: string[];
}

export interface Oas3Schema extends Oas3XSchemaBase {
  type?: string;
  properties?: { [name: string]: Referenced<Oas3Schema> };
  additionalProperties?: boolean | Oas3Schema;
  items?: Oas3Schema;
  exclusiveMaximum?: boolean;
  exclusiveMinimum?: boolean;
  oneOf?: Oas3Schema[];
  anyOf?: Oas3Schema[];
  allOf?: Oas3Schema[];
  not?: Oas3Schema;
}

export interface Oas3_1Schema extends Oas3XSchemaBase {
  type?: string | string[];
  properties?: { [name: string]: Referenced<Oas3_1Schema> };
  additionalProperties?: boolean | Oas3_1Schema;
  examples?: unknown[];
  prefixItems?: Oas3_1Schema[];
  items?: Oas3_1Schema;
  oneOf?: Oas3_1Schema[];
  anyOf?: Oas3_1Schema[];
  allOf?: Oas3_1Schema[];
  not?: Oas3_1Schema;
  exclusiveMaximum?: number;
  exclusiveMinimum?: number;
  const?: unknown;
  contains?: Oas3_1Schema;
  minContains?: number;
  maxContains?: number;
  propertyNames?: Oas3_1Schema;
  if?: Oas3_1Schema;
  then?: Oas3_1Schema;
  else?: Oas3_1Schema;
  dependentRequired?: { [name: string]: string[] };
  dependentSchemas?: { [name: string]: Referenced<Oas3_1Schema> };
  patternProperties?: { [name: string]: Referenced<Oas3_1Schema> };
  unevaluatedItems?: Oas3_1Schema;
  unevaluatedProperties?: Oas3_1Schema;
  contentSchema?: Oas3_1Schema;
  contentMediaType?: string;
  contentEncoding?: string;
}

export interface Oas3_1Definition extends Oas3Definition {
  webhooks?: Oas3_1Webhooks;
}

export interface Oas3_1Webhooks {
  [webhook: string]: Referenced<Oas3PathItem>;
}

export interface Oas3Discriminator {
  propertyName: string;
  mapping?: { [name: string]: string };
  'x-explicitMappingOnly'?: boolean;
}

export interface Oas3MediaType {
  schema?: Referenced<Oas3Schema>;
  example?: unknown;
  examples?: { [name: string]: Referenced<Oas3Example> };
  encoding?: { [field: string]: Oas3Encoding };
}

export interface Oas3Encoding {
  contentType: string;
  headers?: { [name: string]: Referenced<Oas3Header> };
  style: Oas3ParameterStyle;
  explode: boolean;
  allowReserved: boolean;
}

export type Oas3ParameterLocation = 'query' | 'header' | 'path' | 'cookie';
export type Oas3ParameterStyle =
  | 'matrix'
  | 'label'
  | 'form'
  | 'simple'
  | 'spaceDelimited'
  | 'pipeDelimited'
  | 'deepObject';

export interface Oas3RequestBody {
  description?: string;
  required?: boolean;
  content: { [mime: string]: Oas3MediaType };
}

export interface Oas3Responses {
  [code: string]: Oas3Response;
}

export interface Oas3Response {
  description?: string;
  headers?: { [name: string]: Referenced<Oas3Header> };
  content?: { [mime: string]: Oas3MediaType };
  links?: { [name: string]: Referenced<Oas3Link> };
}

export interface Oas3Link {
  $ref?: string;
}

export type Oas3Header = Omit<Oas3Parameter, 'in' | 'name'>;

export interface Oas3Callback {
  [name: string]: Oas3PathItem;
}

export interface Oas3Components {
  schemas?: { [name: string]: Referenced<Oas3Schema> };
  responses?: { [name: string]: Referenced<Oas3Response> };
  parameters?: { [name: string]: Referenced<Oas3Parameter> };
  examples?: { [name: string]: Referenced<Oas3Example> };
  requestBodies?: { [name: string]: Referenced<Oas3RequestBody> };
  headers?: { [name: string]: Referenced<Oas3Header> };
  securitySchemes?: { [name: string]: Referenced<Oas3SecurityScheme> };
  links?: { [name: string]: Referenced<Oas3Link> };
  callbacks?: { [name: string]: Referenced<Oas3Callback> };
}

export type Oas3ComponentName = keyof Oas3Components;

export interface Oas3SecurityRequirement {
  [name: string]: string[];
}

export interface Oas3SecurityScheme {
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

export interface Oas3Tag {
  name: string;
  description?: string;
  externalDocs?: Oas3ExternalDocs;
  'x-displayName'?: string;
}

export interface Oas3ExternalDocs {
  description?: string;
  url: string;
}

export interface Oas3Contact {
  name?: string;
  url?: string;
  email?: string;
}

export interface Oas3License {
  name: string;
  url?: string;
}
