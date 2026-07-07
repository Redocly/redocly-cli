import { pointerBaseName } from '../ref-utils.js';
import { isPlainObject } from '../utils/is-plain-object.js';

const MAX_PROPERTY_NAMES = 8;

function refBaseName(node: unknown): string | undefined {
  return isPlainObject(node) && typeof node.$ref === 'string'
    ? pointerBaseName(node.$ref)
    : undefined;
}

function responseSchemaName(response: unknown): string | undefined {
  if (!isPlainObject(response)) return undefined;
  // OAS2 responses hold the schema directly; OAS3 nests it under content/<media-type>
  const mediaTypes = isPlainObject(response.content) ? Object.values(response.content) : [response];
  for (const mediaType of mediaTypes) {
    if (!isPlainObject(mediaType)) continue;
    const name = refBaseName(mediaType.schema);
    if (name) return name;
  }
  return undefined;
}

export function deriveOperationSummary(operation: unknown): string | undefined {
  if (!isPlainObject(operation)) return undefined;
  const parts: string[] = [];

  if (isPlainObject(operation.responses)) {
    const codes = Object.keys(operation.responses);
    if (codes.length > 0) {
      const primary = codes.find((code) => code.startsWith('2')) ?? codes[0];
      const schemaName = responseSchemaName(operation.responses[primary]);
      const described = codes.map((code) =>
        code === primary && schemaName ? `${code} (${schemaName})` : code
      );
      parts.push(`Returns ${described.join(', ')}.`);
    }
  }

  if (Array.isArray(operation.parameters) && operation.parameters.length > 0) {
    const names = operation.parameters
      .map((parameter) =>
        isPlainObject(parameter) && typeof parameter.name === 'string'
          ? parameter.name
          : refBaseName(parameter)
      )
      .filter(Boolean);
    if (names.length > 0) {
      parts.push(`Parameters: ${names.join(', ')}.`);
    }
  }

  return parts.length > 0 ? parts.join(' ') : undefined;
}

export function deriveSchemaSummary(schema: unknown): string | undefined {
  if (!isPlainObject(schema)) return undefined;
  if (schema.type === 'array' || isPlainObject(schema.items)) {
    const items = refBaseName(schema.items) ?? getType(schema.items);
    return items ? `array of ${items}` : 'array';
  }
  if (schema.type === 'object' || isPlainObject(schema.properties)) {
    const names = isPlainObject(schema.properties) ? Object.keys(schema.properties) : [];
    if (names.length === 0) return 'object';
    const shown = names.slice(0, MAX_PROPERTY_NAMES);
    if (names.length > MAX_PROPERTY_NAMES) shown.push('…');
    return `object: ${shown.join(', ')}`;
  }
  return undefined;
}

function getType(node: unknown): string | undefined {
  return isPlainObject(node) && typeof node.type === 'string' ? node.type : undefined;
}

export function deriveAsync2OperationSummary(operation: unknown): string | undefined {
  if (!isPlainObject(operation)) return undefined;
  const message = operation.message;
  const name =
    refBaseName(message) ??
    (isPlainObject(message)
      ? (typeof message.name === 'string' && message.name) ||
        (typeof message.title === 'string' && message.title) ||
        undefined
      : undefined);
  return name ? `message: ${name}` : undefined;
}

export function deriveAsync3OperationSummary(operation: unknown): string | undefined {
  if (!isPlainObject(operation) || typeof operation.action !== 'string') return undefined;
  const channel = refBaseName(operation.channel);
  return channel ? `${operation.action} to ${channel}` : operation.action;
}
