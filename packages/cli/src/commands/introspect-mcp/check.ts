import { isPlainObject } from '@redocly/openapi-core';
import { isDeepStrictEqual } from 'node:util';

import { entriesByName } from './update-description.js';

function namedListChanges(existingEntries: unknown, updatedEntries: unknown): string | undefined {
  const existingByName = entriesByName(existingEntries);
  const updatedByName = entriesByName(updatedEntries);
  const added = [...updatedByName.keys()].filter((name) => !existingByName.has(name));
  const removed = [...existingByName.keys()].filter((name) => !updatedByName.has(name));
  const changed = [...updatedByName.keys()].filter(
    (name) =>
      existingByName.has(name) &&
      !isDeepStrictEqual(existingByName.get(name), updatedByName.get(name))
  );

  const parts: string[] = [];
  if (added.length > 0) {
    parts.push(`added: ${added.join(', ')}`);
  }
  if (removed.length > 0) {
    parts.push(`removed: ${removed.join(', ')}`);
  }
  if (changed.length > 0) {
    parts.push(`changed: ${changed.join(', ')}`);
  }
  return parts.length > 0 ? parts.join('; ') : undefined;
}

/**
 * Compare the document on disk with what an introspection run would write and describe the
 * differences, one line per change. An empty result means the document is up to date.
 */
export function describeXMcpChanges(
  existingDocument: Record<string, unknown>,
  updatedDocument: Record<string, unknown>
): string[] {
  if (isDeepStrictEqual(existingDocument, updatedDocument)) {
    return [];
  }

  const existingXMcp: Record<string, unknown> = isPlainObject(existingDocument['x-mcp'])
    ? existingDocument['x-mcp']
    : {};
  const updatedXMcp: Record<string, unknown> = isPlainObject(updatedDocument['x-mcp'])
    ? updatedDocument['x-mcp']
    : {};

  const changes: string[] = [];
  for (const listName of ['tools', 'prompts', 'resources'] as const) {
    const listChanges = namedListChanges(existingXMcp[listName], updatedXMcp[listName]);
    if (listChanges) {
      changes.push(`${listName} - ${listChanges}`);
    }
  }
  if (!isDeepStrictEqual(existingXMcp.protocolVersion, updatedXMcp.protocolVersion)) {
    changes.push(
      `protocolVersion - ${existingXMcp.protocolVersion ?? 'not set'} -> ${
        updatedXMcp.protocolVersion
      }`
    );
  }
  if (!isDeepStrictEqual(existingXMcp.capabilities, updatedXMcp.capabilities)) {
    changes.push('capabilities changed');
  }
  if (!isDeepStrictEqual(existingDocument.servers, updatedDocument.servers)) {
    changes.push('servers - the MCP server URL is not listed');
  }
  if (changes.length === 0) {
    changes.push('x-mcp changed');
  }
  return changes;
}
