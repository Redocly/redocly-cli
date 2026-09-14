import type { Prompt } from '@modelcontextprotocol/sdk/types.js';
import { isPlainObject } from '@redocly/openapi-core';

import type { McpServerSnapshot } from './introspect.js';

export function entriesByName(entries: unknown): Map<unknown, Record<string, unknown>> {
  const byName = new Map<unknown, Record<string, unknown>>();
  for (const entry of Array.isArray(entries) ? entries : []) {
    if (isPlainObject(entry)) {
      byName.set(entry.name, entry);
    }
  }
  return byName;
}

/**
 * The `x-mcp` extension lets authors annotate server-reported entries with fields the MCP
 * protocol doesn't carry (`tags` and `security`, plus `example` on prompt arguments).
 * A refresh replaces each list with what the server reports now and carries those
 * annotations over by entry name.
 */
function preserveDocFields<Entry extends { name: string }>(
  freshEntries: Entry[],
  existingEntries: unknown,
  docFields: string[]
): (Entry & Record<string, unknown>)[] {
  const existingByName = entriesByName(existingEntries);
  return freshEntries.map((freshEntry) => {
    const existingEntry = existingByName.get(freshEntry.name);
    const annotations: Record<string, unknown> = {};
    for (const docField of docFields) {
      if (existingEntry && existingEntry[docField] !== undefined) {
        annotations[docField] = existingEntry[docField];
      }
    }
    return { ...freshEntry, ...annotations };
  });
}

function mergePrompts(freshPrompts: Prompt[], existingPrompts: unknown) {
  const existingByName = entriesByName(existingPrompts);
  return preserveDocFields(freshPrompts, existingPrompts, ['tags', 'security']).map((prompt) => {
    if (!prompt.arguments) {
      return prompt;
    }
    const existingArguments = existingByName.get(prompt.name)?.arguments;
    return {
      ...prompt,
      arguments: preserveDocFields(prompt.arguments, existingArguments, ['example']),
    };
  });
}

/**
 * Record the snapshot in the document's `x-mcp` extension, scaffolding a minimal OpenAPI
 * description from the server info when there is no existing document.
 */
export function updateDescription(
  existingDocument: Record<string, unknown> | undefined,
  snapshot: McpServerSnapshot,
  serverUrl: string | undefined
): Record<string, unknown> {
  const document: Record<string, unknown> = existingDocument ?? {
    openapi: '3.1.0',
    info: {
      title: snapshot.serverInfo?.title || snapshot.serverInfo?.name || 'MCP API',
      ...(snapshot.instructions ? { description: snapshot.instructions } : {}),
      version: snapshot.serverInfo?.version || '1.0.0',
    },
    paths: {},
  };

  const existingXMcp: Record<string, unknown> = isPlainObject(document['x-mcp'])
    ? document['x-mcp']
    : {};
  const xMcp: Record<string, unknown> = { ...existingXMcp };
  if (snapshot.protocolVersion) {
    xMcp.protocolVersion = snapshot.protocolVersion;
  }
  // The MCP endpoint belongs in `x-mcp.servers` - the root `servers` list the REST base URLs.
  // A stdio server has no URL to record.
  if (serverUrl) {
    const mcpServers = Array.isArray(xMcp.servers) ? xMcp.servers : [];
    if (!mcpServers.some((server) => isPlainObject(server) && server.url === serverUrl)) {
      mcpServers.push({ url: serverUrl });
    }
    xMcp.servers = mcpServers;
  }
  if (snapshot.capabilities) {
    xMcp.capabilities = snapshot.capabilities;
  }
  // Each list mirrors the server: a declared capability is recorded even when its list is
  // empty, and the list of an undeclared capability is dropped, so stale entries don't linger.
  if (snapshot.capabilities?.tools) {
    xMcp.tools = preserveDocFields(snapshot.tools, existingXMcp.tools, ['tags', 'security']);
  } else {
    delete xMcp.tools;
  }
  if (snapshot.capabilities?.prompts) {
    xMcp.prompts = mergePrompts(snapshot.prompts, existingXMcp.prompts);
  } else {
    delete xMcp.prompts;
  }
  if (snapshot.capabilities?.resources) {
    xMcp.resources = preserveDocFields(snapshot.resources, existingXMcp.resources, [
      'tags',
      'security',
    ]);
  } else {
    delete xMcp.resources;
  }
  document['x-mcp'] = xMcp;

  return document;
}
