import {
  Client,
  SSEClientTransport,
  StreamableHTTPClientTransport,
  type Implementation,
  type Prompt,
  type Resource,
  type ServerCapabilities,
  type Tool,
  type Transport,
} from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { logger, HandledError } from '@redocly/openapi-core';
import { gray } from 'colorette';

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

type ConnectionAttempt = {
  createTransport: () => Transport;
  versionNegotiation: 'auto' | 'legacy';
  retryMessage?: string;
};

function connectionAttempts(target: McpTarget): ConnectionAttempt[] {
  if (target.kind === 'stdio') {
    return [
      {
        createTransport: () =>
          new StdioClientTransport({
            command: target.command,
            args: target.args,
            env: inheritedEnvironment(),
          }),
        versionNegotiation: 'auto',
      },
    ];
  }
  const createStreamableHttpTransport = () =>
    new StreamableHTTPClientTransport(target.url, { requestInit: { headers: target.headers } });
  // The `auto` mode tries `server/discover` of protocol 2026-07-28 and falls back to `initialize`.
  // Over HTTP it fails on a 5xx status or no answer, so the second attempt sends `initialize`.
  return [
    { createTransport: createStreamableHttpTransport, versionNegotiation: 'auto' },
    {
      createTransport: createStreamableHttpTransport,
      versionNegotiation: 'legacy',
      retryMessage: 'Retrying with the initialize handshake...',
    },
    {
      createTransport: () =>
        new SSEClientTransport(target.url, { requestInit: { headers: target.headers } }),
      versionNegotiation: 'legacy',
      retryMessage: 'Retrying with the legacy HTTP+SSE transport...',
    },
  ];
}

async function connectClient(target: McpTarget, version: string): Promise<Client> {
  let firstError: unknown;
  for (const { createTransport, versionNegotiation, retryMessage } of connectionAttempts(target)) {
    if (retryMessage) {
      logger.info(gray(`  ${retryMessage} \n`));
    }
    const mcpClient = new Client(
      { name: 'redocly-cli', version },
      { versionNegotiation: { mode: versionNegotiation } }
    );
    try {
      await mcpClient.connect(createTransport());
      return mcpClient;
    } catch (error) {
      firstError ??= error;
      await mcpClient.close().catch(() => undefined);
    }
  }
  throw new HandledError(
    `Failed to connect to the MCP server at ${targetLabel(target)}: ${
      firstError instanceof Error ? firstError.message : String(firstError)
    }`
  );
}

export async function introspectMcpServer(
  target: McpTarget,
  version: string
): Promise<McpServerSnapshot> {
  const mcpClient = await connectClient(target, version);

  try {
    const capabilities = mcpClient.getServerCapabilities();
    // The lists are read page by page with `request`, because `listTools`, `listPrompts`, and
    // `listResources` stop after 64 pages, and `listTools` drops the tools it finds invalid.
    const tools = capabilities?.tools
      ? await collectAllPages(async (cursor) => {
          const page = await mcpClient.request({ method: 'tools/list', params: { cursor } });
          return { items: page.tools, nextCursor: page.nextCursor };
        })
      : [];
    const prompts = capabilities?.prompts
      ? await collectAllPages(async (cursor) => {
          const page = await mcpClient.request({ method: 'prompts/list', params: { cursor } });
          return { items: page.prompts, nextCursor: page.nextCursor };
        })
      : [];
    const resources = capabilities?.resources
      ? await collectAllPages(async (cursor) => {
          const page = await mcpClient.request({ method: 'resources/list', params: { cursor } });
          return { items: page.resources, nextCursor: page.nextCursor };
        })
      : [];

    return {
      protocolVersion: mcpClient.getNegotiatedProtocolVersion(),
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
