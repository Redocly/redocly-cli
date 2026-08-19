import { isPlainObject } from '@redocly/openapi-core';

import { isHttpMethod } from '../../drift/openapi/loader.js';
import { resolve, type Schema } from './schema.js';

export interface DeclaredParameter {
  name: string;
  in: string;
  required: boolean;
  /** The values an `enum` pins the parameter to, empty when it pins none. */
  values: unknown[];
}

export interface ParameterCoverage {
  seen: number;
  total: number;
  /** `GET /path  query.sellerId`, for the parameters nothing sent. */
  unused: string[];
  /** `GET /path  query.status=archived`, for the enum values nothing used. */
  unusedValues: string[];
}

export interface ParameterUse {
  /** Operation key → the `in.name` of every parameter a request carried. */
  sent: Map<string, Set<string>>;
  /** Operation key and `in.name` → the values requests carried. */
  values: Map<string, Set<string>>;
}

export interface RequestParameters {
  query: URLSearchParams;
  pathParams: Record<string, string>;
  headers: Record<string, string>;
}

export function createParameterUse(): ParameterUse {
  return { sent: new Map(), values: new Map() };
}

function parameterKey(parameter: { in: string; name: string }): string {
  return `${parameter.in}.${parameter.name}`;
}

function label(operationKey: string, suffix: string): string {
  const [method, ...rest] = operationKey.split(' ');

  return `${method.toUpperCase()} ${rest.join(' ')}  ${suffix}`;
}

/** Every parameter each operation documents, keyed as `method path`. */
export function collectParameters(spec: Schema): Map<string, DeclaredParameter[]> {
  const byOperation = new Map<string, DeclaredParameter[]>();

  for (const [pathTemplate, item] of Object.entries(spec.paths ?? {}) as [string, Schema][]) {
    const { schema: pathItem } = resolve(spec, item);
    if (!pathItem) continue;

    for (const [method, operation] of Object.entries(pathItem) as [string, Schema][]) {
      if (!isHttpMethod(method) || !isPlainObject(operation)) continue;

      // A parameter on the operation replaces the path item's one of the same
      // name and location, so the operation's entries are read last.
      const declared = new Map<string, DeclaredParameter>();
      const listed = [...(pathItem.parameters ?? []), ...((operation as Schema).parameters ?? [])];

      for (const entry of listed as Schema[]) {
        const { schema: parameter } = resolve(spec, entry);
        if (!parameter?.name || !parameter.in) continue;

        const { schema: parameterSchema } = resolve(spec, parameter.schema);
        declared.set(parameterKey(parameter as { in: string; name: string }), {
          name: parameter.name,
          in: parameter.in,
          required: parameter.required === true,
          values: parameterSchema?.enum ?? [],
        });
      }

      byOperation.set(`${method} ${pathTemplate}`, [...declared.values()]);
    }
  }

  return byOperation;
}

function cookiesOf(headers: Record<string, string>): Record<string, string> {
  const header = headers.cookie ?? headers.Cookie;
  if (!header) return {};

  return Object.fromEntries(
    header
      .split(';')
      .map((pair) => pair.split('='))
      .filter(([name]) => name?.trim())
      .map(([name, ...value]) => [name.trim(), value.join('=').trim()])
  );
}

/** Note which documented parameters one request carried, and with what values. */
export function recordParameters(
  use: ParameterUse,
  operationKey: string,
  request: RequestParameters
): void {
  const carried: [string, string][] = [
    ...[...request.query.entries()].map(
      ([name, value]) => [`query.${name}`, value] as [string, string]
    ),
    ...Object.entries(request.pathParams).map(
      ([name, value]) => [`path.${name}`, value] as [string, string]
    ),
    ...Object.entries(request.headers).map(
      ([name, value]) => [`header.${name}`, value] as [string, string]
    ),
    ...Object.entries(cookiesOf(request.headers)).map(
      ([name, value]) => [`cookie.${name}`, value] as [string, string]
    ),
  ];

  if (!use.sent.has(operationKey)) use.sent.set(operationKey, new Set());

  for (const [key, value] of carried) {
    use.sent.get(operationKey)!.add(key.toLowerCase());

    const valueKey = `${operationKey} ${key.toLowerCase()}`;
    if (!use.values.has(valueKey)) use.values.set(valueKey, new Set());
    use.values.get(valueKey)!.add(value);
  }
}

/** Which documented parameters, and which of their pinned values, the traffic reached. */
export function summarizeParameters(
  declared: Map<string, DeclaredParameter[]>,
  use: ParameterUse
): ParameterCoverage {
  const unused: string[] = [];
  const unusedValues: string[] = [];
  let total = 0;
  let seen = 0;

  for (const [operationKey, parameters] of declared) {
    // A header name arrives in whatever case the client sent, so both sides are
    // compared lowercased.
    const sent = use.sent.get(operationKey) ?? new Set<string>();

    for (const parameter of parameters) {
      const key = parameterKey(parameter).toLowerCase();
      total += 1;

      if (!sent.has(key)) {
        unused.push(label(operationKey, parameterKey(parameter)));
        continue;
      }

      seen += 1;

      const used = use.values.get(`${operationKey} ${key}`) ?? new Set<string>();
      for (const value of parameter.values) {
        if (used.has(String(value))) continue;

        unusedValues.push(label(operationKey, `${parameterKey(parameter)}=${String(value)}`));
      }
    }
  }

  return { seen, total, unused: unused.sort(), unusedValues: unusedValues.sort() };
}
