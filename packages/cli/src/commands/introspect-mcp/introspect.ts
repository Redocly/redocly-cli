import {
  Client,
  SdkError,
  SdkErrorCode,
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
  const seenCursors = new Set<string>();
  let cursor: string | undefined;
  while (true) {
    const page = await listPage(cursor);
    items.push(...page.items);
    cursor = page.nextCursor;
    if (!cursor) {
      return items;
    }
    if (seenCursors.has(cursor)) {
      throw new HandledError(
        'The MCP server returned the same pagination cursor twice, so its list never ends.'
      );
    }
    seenCursors.add(cursor);
  }
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

async function connectClient(target: McpTarget, version: string): Promise<Client> {
  // The `auto` mode tries `server/discover` of protocol 2026-07-28 and falls back to `initialize`.
  // Over HTTP it fails on a 5xx status or no answer, so the second attempt sends `initialize`.
  const attempts: {
    createTransport: () => Transport;
    versionNegotiation: 'auto' | 'legacy';
    afterProbeFailure?: boolean;
    retryMessage?: string;
  }[] = [];
  if (target.kind === 'stdio') {
    attempts.push({
      createTransport: () =>
        new StdioClientTransport({
          command: target.command,
          args: target.args,
          env: inheritedEnvironment(),
        }),
      versionNegotiation: 'auto',
    });
  } else {
    const createStreamableHttpTransport = () =>
      new StreamableHTTPClientTransport(target.url, { requestInit: { headers: target.headers } });
    attempts.push(
      { createTransport: createStreamableHttpTransport, versionNegotiation: 'auto' },
      {
        createTransport: createStreamableHttpTransport,
        versionNegotiation: 'legacy',
        afterProbeFailure: true,
        retryMessage: 'Retrying with the initialize handshake...',
      },
      {
        createTransport: () =>
          new SSEClientTransport(target.url, { requestInit: { headers: target.headers } }),
        versionNegotiation: 'legacy',
        retryMessage: 'Retrying with the legacy HTTP+SSE transport...',
      }
    );
  }

  let connectionError: unknown;
  let probeFailed = false;
  for (const attempt of attempts) {
    if (attempt.afterProbeFailure && !probeFailed) {
      continue;
    }
    if (attempt.retryMessage) {
      logger.info(gray(`  ${attempt.retryMessage} \n`));
    }
    const mcpClient = new Client(
      { name: 'redocly-cli', version },
      { versionNegotiation: { mode: attempt.versionNegotiation } }
    );
    try {
      await mcpClient.connect(attempt.createTransport());
      return mcpClient;
    } catch (error) {
      // The error of the `initialize` attempt replaces the error of the failed probe before it.
      connectionError = attempt.afterProbeFailure ? error : (connectionError ?? error);
      probeFailed =
        error instanceof SdkError &&
        (error.code === SdkErrorCode.EraNegotiationFailed ||
          error.code === SdkErrorCode.RequestTimeout);
      await mcpClient.close().catch(() => undefined);
    }
  }
  throw new HandledError(
    `Failed to connect to the MCP server at ${targetLabel(target)}: ${
      connectionError instanceof Error ? connectionError.message : String(connectionError)
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
