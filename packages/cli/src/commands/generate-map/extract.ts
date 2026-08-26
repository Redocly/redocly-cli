import { isPlainObject, type SecurityView } from '@redocly/openapi-core';

/** Resolves a `$ref` string from an operation's content to the parsed schema it points at. */
export type ResolveSchema = (ref: string) => Record<string, unknown> | undefined;

const MAX_BODY_FIELDS = 10;
const MAX_ENUM_VALUES = 6;
const MAX_ITEM_FIELDS = 5;

export function renderRowAuth(security: SecurityView | undefined): string | undefined {
  if (security === undefined) return undefined;
  if (security.requirements.length === 0) return 'none';
  // An `apiKey` scheme's name says nothing about where the key goes, and a caller that has to
  // join the row to a schemes section elsewhere in the file mostly does not: carry the header,
  // query, or cookie on the row itself.
  const keyLocation = new Map(
    security.schemes
      .filter((scheme) => scheme.type === 'apiKey' && scheme.in && scheme.keyName)
      .map((scheme) => [scheme.name, `${scheme.in} ${scheme.keyName}`])
  );
  return security.requirements
    .map((requirement) =>
      Object.entries(requirement)
        .map(([name, scopes]) => {
          const detail = scopes.length > 0 ? scopes.join(' ') : keyLocation.get(name);
          return detail === undefined ? name : `${name} (${detail})`;
        })
        .join(' + ')
    )
    .join(' | ');
}

export function extractBodyFields(
  operation: Record<string, unknown>,
  resolve: ResolveSchema
): string | undefined {
  const requestBody = deref(operation.requestBody, resolve);
  if (!isPlainObject(requestBody) || !isPlainObject(requestBody.content)) return undefined;
  const contentTypes = Object.keys(requestBody.content);
  const jsonType = contentTypes.find((type) => type.includes('json'));
  if (jsonType === undefined) return contentTypes[0];
  const media = requestBody.content[jsonType];
  const schema = deref(isPlainObject(media) ? media.schema : undefined, resolve);
  if (!isPlainObject(schema)) return undefined;
  return renderFields(schema, resolve);
}

function renderFields(schema: Record<string, unknown>, resolve: ResolveSchema): string | undefined {
  const merged = mergeAllOf(schema, resolve);
  const properties = isPlainObject(merged.properties) ? merged.properties : {};
  const required = new Set(Array.isArray(merged.required) ? (merged.required as string[]) : []);
  const names = Object.keys(properties);
  if (names.length === 0) return undefined;
  const ordered = [
    ...names.filter((name) => required.has(name)),
    ...names.filter((name) => !required.has(name)),
  ];
  const rendered = ordered
    .slice(0, MAX_BODY_FIELDS)
    .map((name) => renderField(name, properties[name], required.has(name), resolve));
  const overflow = ordered.length - MAX_BODY_FIELDS;
  return overflow > 0 ? `${rendered.join(', ')} +${overflow} more` : rendered.join(', ');
}

function renderField(
  name: string,
  rawSchema: unknown,
  isRequired: boolean,
  resolve: ResolveSchema
): string {
  const marker = isRequired ? '*' : '';
  if (isPlainObject(rawSchema) && typeof rawSchema.$ref === 'string') {
    return `${name}${marker}→${refName(rawSchema.$ref)}`;
  }
  const shorthand = typeShorthand(rawSchema, isRequired, resolve);
  return shorthand === '' ? `${name}${marker}` : `${name}${marker}:${shorthand}`;
}

function typeShorthand(rawSchema: unknown, withEnum: boolean, resolve: ResolveSchema): string {
  const schema = deref(rawSchema, resolve);
  if (!isPlainObject(schema)) return '';
  if (withEnum && Array.isArray(schema.enum) && schema.enum.length <= MAX_ENUM_VALUES) {
    return schema.enum.map(String).join('|');
  }
  const type = schema.type;
  if (type === 'array') {
    const items = deref(schema.items, resolve);
    if (isPlainObject(items) && items.type === 'object') {
      const itemRequired = Array.isArray(items.required) ? (items.required as string[]) : [];
      const shown = itemRequired.slice(0, MAX_ITEM_FIELDS).map((field) => `${field}*`);
      const overflow = itemRequired.length - MAX_ITEM_FIELDS;
      return `[{${shown.join(', ')}${overflow > 0 ? ` +${overflow}` : ''}}]`;
    }
    return `[${typeShorthand(items, false, resolve) || 'any'}]`;
  }
  if (type === 'string') return '';
  if (type === 'integer') return 'int';
  if (type === 'number') return 'num';
  if (type === 'boolean') return 'bool';
  if (type === 'object' || isPlainObject(schema.properties)) return 'obj';
  return '';
}

/** Merges one level of `allOf` members so their fields read as one list, as the card signatures do. */
function mergeAllOf(
  schema: Record<string, unknown>,
  resolve: ResolveSchema
): Record<string, unknown> {
  if (!Array.isArray(schema.allOf)) return schema;
  const properties: Record<string, unknown> = isPlainObject(schema.properties)
    ? { ...schema.properties }
    : {};
  const required: string[] = Array.isArray(schema.required)
    ? [...(schema.required as string[])]
    : [];
  for (const member of schema.allOf) {
    const resolved = deref(member, resolve);
    if (!isPlainObject(resolved)) continue;
    if (isPlainObject(resolved.properties)) Object.assign(properties, resolved.properties);
    if (Array.isArray(resolved.required)) required.push(...(resolved.required as string[]));
  }
  return { ...schema, properties, required };
}

/** Follows `$ref` (and single-`$ref` wrapper objects) up to three hops. */
export function deref(node: unknown, resolve: ResolveSchema): unknown {
  let current = node;
  for (let hop = 0; hop < 3; hop++) {
    if (!isPlainObject(current) || typeof current.$ref !== 'string') return current;
    const target = resolve(current.$ref);
    if (target === undefined) return current;
    current = target;
  }
  return current;
}

function refName(ref: string): string {
  const tail = ref.split('/').pop() ?? ref;
  return tail.replace(/\.(ya?ml|json)$/, '');
}

// Both spellings of an id-like field: snake_case (`capture_id`) and camelCase (`ticketId`).
const CARRY_FIELD_PATTERN = /(^|_)(id|url|token)$|[a-z0-9](Id|Url|Token)$/;
const MAX_CARRY_FIELDS = 4;
const MAX_CARRY_DEPTH = 5;

export function extractRequiredParams(
  operation: Record<string, unknown>,
  resolve: ResolveSchema
): string | undefined {
  if (!Array.isArray(operation.parameters)) return undefined;
  const names = operation.parameters
    .map((parameter) => deref(parameter, resolve))
    .filter(isPlainObject)
    .filter((parameter) => parameter.required === true && parameter.in !== 'path')
    .map((parameter) => String(parameter.name));
  return names.length > 0 ? names.join(', ') : undefined;
}

export function extractResponseCarry(
  operation: Record<string, unknown>,
  resolve: ResolveSchema
): string | undefined {
  if (!isPlainObject(operation.responses)) return undefined;
  const code = Object.keys(operation.responses)
    .filter((key) => /^2\d\d$/.test(key))
    .sort()[0];
  if (code === undefined) return undefined;

  const host = operationHost(operation);
  const response = deref(operation.responses[code], resolve);
  const content = isPlainObject(response) ? response.content : undefined;
  const jsonType = isPlainObject(content)
    ? Object.keys(content).find((type) => type.includes('json'))
    : undefined;
  const media = jsonType !== undefined && isPlainObject(content) ? content[jsonType] : undefined;
  const schema = deref(isPlainObject(media) ? media.schema : undefined, resolve);
  if (!isPlainObject(schema)) return host === undefined ? code : `${code}→{ ⇒ ${host}}`;

  const fields = collectCarryFields(schema, resolve);
  if (fields.length === 0 && host === undefined) return code;
  const suffix = host === undefined ? '' : ` ⇒ ${host}`;
  return `${code}→{${fields.join(', ')}${suffix}}`;
}

function collectCarryFields(schema: Record<string, unknown>, resolve: ResolveSchema): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  const required = new Set(Array.isArray(schema.required) ? (schema.required as string[]) : []);

  const visit = (node: unknown, path: string, depth: number) => {
    if (found.length >= MAX_CARRY_FIELDS || depth > MAX_CARRY_DEPTH) return;
    const resolved = deref(node, resolve);
    if (!isPlainObject(resolved)) return;
    if (resolved.type === 'array') {
      visit(resolved.items, `${path}[]`, depth);
      return;
    }
    if (!isPlainObject(resolved.properties)) return;
    for (const [name, child] of Object.entries(resolved.properties)) {
      if (found.length >= MAX_CARRY_FIELDS) return;
      const childPath = path === '' ? name : `${path}.${name}`;
      const carries = (depth === 0 && required.has(name)) || CARRY_FIELD_PATTERN.test(name);
      if (carries && !seen.has(childPath)) {
        seen.add(childPath);
        found.push(childPath);
      }
      visit(child, childPath, depth + 1);
    }
  };

  visit(schema, '', 0);
  return found;
}

function operationHost(operation: Record<string, unknown>): string | undefined {
  if (!Array.isArray(operation.servers) || !isPlainObject(operation.servers[0])) return undefined;
  const url = operation.servers[0].url;
  return typeof url === 'string'
    ? url.replace(/^[a-z+]+:\/\//i, '').replace(/\/.*$/, '')
    : undefined;
}
