import type {
  ApiModel,
  NamedSchemaModel,
  OperationModel,
  ParamModel,
  ResponseBodyModel,
  SchemaModel,
} from '../../ir/model.js';
import { emitSingleFile } from '../client.js';

/** A plain `string` scalar — the default schema for params and the most-reused leaf. */
export const SCALAR: SchemaModel = { kind: 'scalar', scalar: 'string' };

/** A minimal valid `ApiModel`; spread `overrides` to vary one facet per test. */
export function apiModel(overrides: Partial<ApiModel> = {}): ApiModel {
  return {
    title: 'T',
    version: '1.0.0',
    baseUrl: 'https://api.example.com',
    services: [{ name: 'Default', operations: [] }],
    schemas: [],
    securitySchemes: [],
    ...overrides,
  };
}

export function namedSchema(
  name: string,
  schema: SchemaModel,
  description?: string
): NamedSchemaModel {
  return { name, schema, description };
}

/** A minimal `GET /p` operation; spread `overrides` to add params, a body, responses, etc. */
export function operation(overrides: Partial<OperationModel> = {}): OperationModel {
  return {
    name: 'op',
    method: 'get',
    path: '/p',
    pathParams: [],
    queryParams: [],
    headerParams: [],
    successResponses: [],
    errorResponses: [],
    security: [],
    tags: [],
    ...overrides,
  };
}

export function param(
  name: string,
  loc: ParamModel['in'],
  required = false,
  schema: SchemaModel = SCALAR
): ParamModel {
  return { name, in: loc, schema, required };
}

/** A JSON `ResponseBodyModel`, defaulting to `status: 200`; spread to vary status/schema. */
export function response(overrides: Partial<ResponseBodyModel> = {}): ResponseBodyModel {
  return { contentType: 'application/json', schema: SCALAR, status: 200, ...overrides };
}

/** Emit a single-file client whose only operation is `operation(op)`. */
export function emitWithOp(op: Partial<OperationModel>): string {
  return emitSingleFile(apiModel({ services: [{ name: 'Default', operations: [operation(op)] }] }));
}
