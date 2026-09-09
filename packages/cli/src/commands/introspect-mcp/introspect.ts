import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type {
  Implementation,
  Prompt,
  Resource,
  ServerCapabilities,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

import { exitWithError } from '../../utils/error.js';

export type McpServerSnapshot = {
  protocolVersion?: string;
  capabilities?: ServerCapabilities;
  serverInfo?: Implementation;
  instructions?: string;
  tools: Tool[];
  prompts: Prompt[];
  resources: Resource[];
};

async function collectAllPages<Item>(
  listPage: (cursor: string | undefined) => Promise<{ items: Item[]; nextCursor?: string }>
): Promise<Item[]> {
  const items: Item[] = [];
  let cursor: string | undefined;
  do {
    const page = await listPage(cursor);
    items.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);
  return items;
}

export async function introspectMcpServer({
  serverUrl,
  headers,
  version,
}: {
  serverUrl: URL;
  headers: Record<string, string>;
  version: string;
}): Promise<McpServerSnapshot> {
  const mcpClient = new Client({ name: 'redocly-cli', version });
  const transport = new StreamableHTTPClientTransport(serverUrl, { requestInit: { headers } });

  try {
    await mcpClient.connect(transport);
  } catch (error) {
    exitWithError(
      `Failed to connect to the MCP server at ${serverUrl.href}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  try {
    const capabilities = mcpClient.getServerCapabilities();
    const tools = capabilities?.tools
      ? await collectAllPages(async (cursor) => {
          const page = await mcpClient.listTools({ cursor });
          return { items: page.tools, nextCursor: page.nextCursor };
        })
      : [];
    const prompts = capabilities?.prompts
      ? await collectAllPages(async (cursor) => {
          const page = await mcpClient.listPrompts({ cursor });
          return { items: page.prompts, nextCursor: page.nextCursor };
        })
      : [];
    const resources = capabilities?.resources
      ? await collectAllPages(async (cursor) => {
          const page = await mcpClient.listResources({ cursor });
          return { items: page.resources, nextCursor: page.nextCursor };
        })
      : [];

    return {
      protocolVersion: transport.protocolVersion,
      capabilities,
      serverInfo: mcpClient.getServerVersion(),
      instructions: mcpClient.getInstructions(),
      tools,
      prompts,
      resources,
    };
  } finally {
    await mcpClient.close();
  }
}
