export type ScalarKind = 'string' | 'number' | 'boolean' | 'integer';

/**
 * Validation / annotation metadata pulled straight from an OpenAPI Schema Object.
 *
 * The renderer projects these into JSDoc tags (`@minimum 1`, `@pattern ...`, …).
 * We deliberately do NOT enforce which keys are valid on which kind (e.g.
 * `minLength` on a number is technically nonsense) — the spec is authoritative
 * and the renderer just emits whatever is set. This keeps the IR cheap and lets
 * us add new tags without ratcheting the type system.
 *
 * `exclusiveMinimum` / `exclusiveMaximum` are always normalized to the OAS 3.1
 * numeric form by the builder, even when the source uses the OAS 3.0 boolean
 * form. This means the emitter has exactly one shape to handle.
 */
export type SchemaMetadata = {
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  format?: string;
  deprecated?: boolean;
  /** A representative value for the schema, used by the mock sampler. From the
   * source `example` field, or the first entry of `examples` (OAS 3.1 array form). */
  example?: unknown;
  /** The schema's `default` value, used as a sampler fallback when no example exists. */
  default?: unknown;
};

/**
 * Discriminator metadata for a union, used to emit `is<Member>()` type guards.
 *
 * `propertyName` is the discriminating property. Each `mapping` entry pairs the
 * discriminant string `value` with the `schemaName` (a named, top-level schema)
 * that value selects. We only retain entries that point at named schemas, since
 * a guard must narrow to an exported type.
 *
 * The builder fills this from an explicit `discriminator` (with or without an
 * explicit `mapping`); the emitter may additionally synthesize one for an
 * *implicit* discriminator (every member constrains a shared property to a
 * distinct `const`).
 */
export type DiscriminatorModel = {
  propertyName: string;
  mapping: Array<{ value: string; schemaName: string }>;
};

export type SchemaModel =
  | { kind: 'scalar'; scalar: ScalarKind; description?: string; metadata?: SchemaMetadata }
  | { kind: 'array'; items: SchemaModel; description?: string; metadata?: SchemaMetadata }
  | { kind: 'object'; properties: PropertyModel[]; description?: string; metadata?: SchemaMetadata }
  | { kind: 'record'; value: SchemaModel; description?: string; metadata?: SchemaMetadata }
  | { kind: 'ref'; name: string; description?: string; metadata?: SchemaMetadata }
  | {
      kind: 'literal';
      value: string | number | boolean;
      description?: string;
      metadata?: SchemaMetadata;
    }
  | {
      kind: 'enum';
      values: Array<string | number | boolean>;
      scalar: ScalarKind;
      description?: string;
      metadata?: SchemaMetadata;
    }
  | {
      kind: 'union';
      members: SchemaModel[];
      discriminator?: DiscriminatorModel;
      description?: string;
      metadata?: SchemaMetadata;
    }
  | {
      kind: 'intersection';
      members: SchemaModel[];
      description?: string;
      metadata?: SchemaMetadata;
    }
  | { kind: 'null'; description?: string; metadata?: SchemaMetadata }
  | { kind: 'unknown'; description?: string; metadata?: SchemaMetadata }
  /**
   * `Omit<base, "k1" | "k2">` — a named schema with some keys removed. Built only
   * for request bodies, where `readOnly` (server-managed) properties must not be
   * sent. `base` is a named schema (an emitted type); `keys` are the readOnly
   * property names dropped from it.
   */
  | {
      kind: 'omit';
      base: string;
      keys: string[];
      description?: string;
      metadata?: SchemaMetadata;
    };

export type PropertyModel = {
  name: string;
  schema: SchemaModel;
  required: boolean;
  description?: string;
  /** `readOnly: true` in the spec — server-managed; dropped from request bodies. */
  readOnly?: boolean;
};

export type ParamModel = {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  schema: SchemaModel;
  required: boolean;
  description?: string;
  /**
   * OpenAPI query-serialization hints, only meaningful for query params (path/header
   * params ignore them). Absent ⇒ the OpenAPI defaults (`form`, `explode: true`); the
   * builder leaves them `undefined` rather than synthesizing defaults, so downstream
   * takes the default serialization path.
   */
  style?: 'form' | 'spaceDelimited' | 'pipeDelimited' | 'deepObject';
  explode?: boolean;
  allowReserved?: boolean;
};

export type RequestBodyModel = {
  contentType: string;
  schema: SchemaModel;
  required: boolean;
  description?: string;
};

export type ResponseBodyModel = {
  contentType: string;
  schema: SchemaModel;
  /**
   * The HTTP status code this response body is declared under (`200`, `404`, …),
   * or `'default'` for the OpenAPI `default` response.
   */
  status: number | 'default';
  /**
   * The per-item payload schema for a streaming/sequential media type (OpenAPI
   * 3.2 `itemSchema`, e.g. on `text/event-stream`). Absent for ordinary bodies.
   */
  itemSchema?: SchemaModel;
};

/**
 * A security scheme the generated client knows how to apply. Only the schemes
 * we can actually inject on the wire are modeled:
 *
 * - `bearer` — `http`+`bearer`, `oauth2`, or `openIdConnect`. All of these end
 *   up as an `Authorization: Bearer <token>` header, so they share one
 *   `setBearer()` setter and one token slot.
 * - `basic` — `http`+`basic`. Injected as an `Authorization: Basic <base64>`
 *   header via the shared `setBasicAuth()` setter.
 * - `apiKeyHeader` — `apiKey` in `header`. Each gets its own setter + slot keyed
 *   by `key`, and injects its own `headerName`.
 * - `apiKeyQuery` — `apiKey` in `query`. Injected as a URL query parameter named
 *   `paramName`.
 * - `apiKeyCookie` — `apiKey` in `cookie`. Injected into a combined `Cookie`
 *   header under `cookieName`.
 *
 * `mutualTLS` (and an `http` scheme other than bearer/basic) is not injectable
 * by the client and is skipped by the builder; an operation referencing only
 * such schemes simply carries no auth.
 */
export type SecuritySchemeModel =
  | { kind: 'bearer'; key: string }
  | { kind: 'basic'; key: string }
  | { kind: 'apiKeyHeader'; key: string; headerName: string }
  | { kind: 'apiKeyQuery'; key: string; paramName: string }
  | { kind: 'apiKeyCookie'; key: string; cookieName: string };

export type OperationModel = {
  name: string;
  method: 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head' | 'options';
  path: string;
  summary?: string;
  description?: string;
  pathParams: ParamModel[];
  queryParams: ParamModel[];
  headerParams: ParamModel[];
  requestBody?: RequestBodyModel;
  successResponses: ResponseBodyModel[];
  /**
   * The operation's declared error responses (4xx/5xx, plus `default` when a 2xx
   * success also exists). Empty when none are declared. Consumed only by
   * `errorMode: 'result'` output, where they type the `error` of the result shape.
   */
  errorResponses: ResponseBodyModel[];
  /**
   * The operation's OpenAPI `tags`, in declared order (empty when none). Used by
   * multi-file output modes to group operations into per-tag files; ignored by
   * the default single-file output.
   */
  tags: string[];
  /**
   * Effective security for this operation: the injectable OR-alternatives, each
   * an AND-set of security-scheme keys (resolving the operation's own `security`
   * over the document default). The runtime applies the first alternative whose
   * credentials are all configured. An empty array means "send no credentials" —
   * either the operation opted out via `security: []` or no applicable scheme exists.
   */
  security: string[][];
  /**
   * The operation's `x-pagination` extension value, captured VERBATIM (spec
   * extensions are untyped). Validated by the pagination emitter, not the IR.
   */
  paginationExtension?: unknown;
};

export type ServiceModel = {
  name: string;
  operations: OperationModel[];
};

export type NamedSchemaModel = {
  name: string;
  schema: SchemaModel;
  description?: string;
};

export type ApiModel = {
  title: string;
  version: string;
  description?: string;
  serverUrl: string;
  services: ServiceModel[];
  schemas: NamedSchemaModel[];
  securitySchemes: SecuritySchemeModel[];
};
