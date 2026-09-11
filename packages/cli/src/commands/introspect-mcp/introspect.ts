import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type {
  Implementation,
  Prompt,
  Resource,
  ServerCapabilities,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { logger } from '@redocly/openapi-core';
import { gray } from 'colorette';

import { exitWithError } from '../../utils/error.js';

export type McpTarget =
  | { kind: 'http'; url: URL; headers: Record<string, string> }
  | { kind: 'stdio'; command: string; args: string[] };

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

// Only the Streamable HTTP transport exposes the negotiated protocol version itself,
// but the client reports it to any transport that listens - so listen on all of them.
function captureProtocolVersion(transport: Transport): () => string | undefined {
  let negotiatedVersion: string | undefined;
  const originalSetProtocolVersion = transport.setProtocolVersion?.bind(transport);
  transport.setProtocolVersion = (protocolVersion: string) => {
    negotiatedVersion = protocolVersion;
    originalSetProtocolVersion?.(protocolVersion);
  };
  return () => negotiatedVersion;
}

// The spawned server inherits the full environment, like running the command in the same
// shell would - stdio servers commonly read their API keys from environment variables.
function inheritedEnvironment(): Record<string, string> {
  const environment: Record<string, string> = {};
  for (const [name, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      environment[name] = value;
    }
  }
  return environment;
}

function targetLabel(target: McpTarget): string {
  return target.kind === 'http'
    ? target.url.href
    : `"${[target.command, ...target.args].join(' ')}"`;
}

async function connectClient(
  target: McpTarget,
  version: string
): Promise<{ mcpClient: Client; getProtocolVersion: () => string | undefined }> {
  // For HTTP, try Streamable HTTP first and fall back to the legacy HTTP+SSE transport,
  // as the MCP specification recommends for clients supporting both.
  const transportAttempts: (() => Transport)[] =
    target.kind === 'stdio'
      ? [
          () =>
            new StdioClientTransport({
              command: target.command,
              args: target.args,
              env: inheritedEnvironment(),
            }),
        ]
      : [
          () =>
            new StreamableHTTPClientTransport(target.url, {
              requestInit: { headers: target.headers },
            }),
          () => new SSEClientTransport(target.url, { requestInit: { headers: target.headers } }),
        ];

  let firstError: unknown;
  for (const [attemptIndex, createTransport] of transportAttempts.entries()) {
    if (attemptIndex > 0) {
      logger.info(gray('  Retrying with the legacy HTTP+SSE transport... \n'));
    }
    const transport = createTransport();
    const getProtocolVersion = captureProtocolVersion(transport);
    const mcpClient = new Client({ name: 'redocly-cli', version });
    try {
      await mcpClient.connect(transport);
      return { mcpClient, getProtocolVersion };
    } catch (error) {
      firstError ??= error;
      await mcpClient.close().catch(() => undefined);
    }
  }
  exitWithError(
    `Failed to connect to the MCP server at ${targetLabel(target)}: ${
      firstError instanceof Error ? firstError.message : String(firstError)
    }`
  );
}

export async function introspectMcpServer(
  target: McpTarget,
  version: string
): Promise<McpServerSnapshot> {
  const { mcpClient, getProtocolVersion } = await connectClient(target, version);

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
      protocolVersion: getProtocolVersion(),
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
