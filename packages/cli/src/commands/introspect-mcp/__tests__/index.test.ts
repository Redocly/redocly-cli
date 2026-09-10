import { Server as McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { parseYaml } from '@redocly/openapi-core';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server as HttpServer } from 'node:http';
import { type AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { outdent } from 'outdent';

import { AbortFlowError } from '../../../utils/error.js';
import type { CommandArgs } from '../../../wrapper.js';
import { handleIntrospectMcp, type IntrospectMcpCommandArgv } from '../index.js';

const CREATE_ORDER_TOOL = {
  name: 'orders/create',
  description: 'Create an order.',
  inputSchema: {
    type: 'object' as const,
    properties: { customerName: { type: 'string' } },
    required: ['customerName'],
  },
};

const LIST_MENU_TOOL = {
  name: 'menu/list',
  description: 'List the menu items.',
  inputSchema: { type: 'object' as const },
};

const DAILY_SPECIAL_PROMPT = {
  name: 'daily-special',
  description: 'Suggest a daily special.',
  arguments: [{ name: 'category', description: 'Menu category.', required: true }],
};

const MENU_RESOURCE = {
  name: 'menu',
  uri: 'cafe://menu',
  description: 'The current menu.',
  mimeType: 'application/json',
};

function buildMcpServer() {
  const mcpServer = new McpServer(
    { name: 'cafe-mcp', version: '3.2.1' },
    {
      capabilities: { tools: {}, prompts: {}, resources: {} },
      instructions: 'Manage the cafe menu and orders.',
    }
  );
  // Tools are served in two pages to exercise cursor pagination.
  mcpServer.setRequestHandler(ListToolsRequestSchema, (listRequest) =>
    listRequest.params?.cursor === 'page-2'
      ? { tools: [LIST_MENU_TOOL] }
      : { tools: [CREATE_ORDER_TOOL], nextCursor: 'page-2' }
  );
  mcpServer.setRequestHandler(ListPromptsRequestSchema, () => ({
    prompts: [DAILY_SPECIAL_PROMPT],
  }));
  mcpServer.setRequestHandler(ListResourcesRequestSchema, () => ({
    resources: [MENU_RESOURCE],
  }));
  return mcpServer;
}

let httpServer: HttpServer;
let serverUrl: string;
let lastAuthHeader: string | string[] | undefined;

// A stateless Streamable HTTP MCP server: every request gets a fresh server and transport.
beforeAll(async () => {
  httpServer = createServer(async (request, response) => {
    lastAuthHeader = request.headers['x-cafe-auth'] ?? lastAuthHeader;
    const mcpServer = buildMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    response.on('close', () => {
      transport.close();
      mcpServer.close();
    });
    await mcpServer.connect(transport);
    await transport.handleRequest(request, response);
  });
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  serverUrl = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}/mcp`;
});

afterAll(async () => {
  await new Promise((resolve) => httpServer.close(resolve));
});

function runIntrospectMcp(argv: Partial<IntrospectMcpCommandArgv> & { output: string }) {
  return handleIntrospectMcp({
    argv: { check: false, ...argv },
    version: '0.0.0',
  } as CommandArgs<IntrospectMcpCommandArgv>);
}

describe('handleIntrospectMcp', () => {
  it('creates an OpenAPI description with the x-mcp extension from a live MCP server', async () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'introspect-mcp-'));
    const outputFile = join(outputDir, 'openapi.yaml');
    try {
      await runIntrospectMcp({
        'server-url': serverUrl,
        output: outputFile,
        header: ['X-Cafe-Auth: secret-token'],
      });

      expect(lastAuthHeader).toBe('secret-token');
      const written = readFileSync(outputFile, 'utf-8').replaceAll(serverUrl, '<server-url>');
      expect(written).toMatchInlineSnapshot(`
        "openapi: 3.1.0
        info:
          title: cafe-mcp
          description: Manage the cafe menu and orders.
          version: 3.2.1
        paths: {}
        x-mcp:
          protocolVersion: '2025-11-25'
          servers:
            - url: <server-url>
          capabilities:
            prompts: {}
            resources: {}
            tools: {}
          tools:
            - name: orders/create
              description: Create an order.
              inputSchema:
                type: object
                properties:
                  customerName:
                    type: string
                required:
                  - customerName
            - name: menu/list
              description: List the menu items.
              inputSchema:
                type: object
          prompts:
            - name: daily-special
              description: Suggest a daily special.
              arguments:
                - name: category
                  description: Menu category.
                  required: true
          resources:
            - name: menu
              uri: cafe://menu
              description: The current menu.
              mimeType: application/json
        "
      `);
    } finally {
      rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('refreshes an existing description, preserving tags, security, and argument examples', async () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'introspect-mcp-'));
    const outputFile = join(outputDir, 'openapi.yaml');
    writeFileSync(
      outputFile,
      outdent`
        openapi: 3.1.0
        info:
          title: Cafe API
          version: 2.0.0
        servers:
          - url: https://api.cafe.example.com
        paths: {}
        x-mcp:
          protocolVersion: 2024-11-05
          tools:
            - name: orders/create
              description: A stale description.
              tags:
                - Orders
              security:
                - OAuth2:
                    - orders:write
            - name: removed/tool
              description: No longer reported by the server.
          prompts:
            - name: daily-special
              arguments:
                - name: category
                  example: beverage
      ` + '\n',
      'utf-8'
    );
    try {
      await runIntrospectMcp({ 'server-url': serverUrl, output: outputFile });

      const written = readFileSync(outputFile, 'utf-8').replaceAll(serverUrl, '<server-url>');
      expect(written).toMatchInlineSnapshot(`
        "openapi: 3.1.0
        info:
          title: Cafe API
          version: 2.0.0
        servers:
          - url: https://api.cafe.example.com
        paths: {}
        x-mcp:
          protocolVersion: '2025-11-25'
          tools:
            - name: orders/create
              description: Create an order.
              inputSchema:
                type: object
                properties:
                  customerName:
                    type: string
                required:
                  - customerName
              tags:
                - Orders
              security:
                - OAuth2:
                    - orders:write
            - name: menu/list
              description: List the menu items.
              inputSchema:
                type: object
          prompts:
            - name: daily-special
              description: Suggest a daily special.
              arguments:
                - name: category
                  description: Menu category.
                  required: true
                  example: beverage
          servers:
            - url: <server-url>
          capabilities:
            prompts: {}
            resources: {}
            tools: {}
          resources:
            - name: menu
              uri: cafe://menu
              description: The current menu.
              mimeType: application/json
        "
      `);
    } finally {
      rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('introspects a local stdio server started with --command', async () => {
    const fixturePath = join(
      dirname(fileURLToPath(import.meta.url)),
      'fixtures',
      'stdio-mcp-server.mjs'
    );
    const outputDir = mkdtempSync(join(tmpdir(), 'introspect-mcp-'));
    // The `generated` folder doesn't exist yet - the command creates it.
    const outputFile = join(outputDir, 'generated', 'openapi.yaml');
    try {
      await runIntrospectMcp({ command: `node ${fixturePath}`, output: outputFile });

      expect(readFileSync(outputFile, 'utf-8')).toMatchInlineSnapshot(`
        "openapi: 3.1.0
        info:
          title: stdio-cafe-mcp
          description: Manage cafe orders over stdio.
          version: 1.2.3
        paths: {}
        x-mcp:
          protocolVersion: '2025-11-25'
          capabilities:
            tools: {}
          tools:
            - name: menu/get
              description: Get the menu.
              inputSchema:
                type: object
        "
      `);
    } finally {
      rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('--check passes on an up-to-date description and fails on a stale one, writing nothing', async () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'introspect-mcp-'));
    const outputFile = join(outputDir, 'openapi.yaml');
    try {
      await runIntrospectMcp({ 'server-url': serverUrl, output: outputFile });
      const upToDate = readFileSync(outputFile, 'utf-8');

      await runIntrospectMcp({ 'server-url': serverUrl, output: outputFile, check: true });
      expect(readFileSync(outputFile, 'utf-8')).toBe(upToDate);

      const stale = upToDate.replace('description: Create an order.', 'description: A stale one.');
      writeFileSync(outputFile, stale, 'utf-8');
      await expect(
        runIntrospectMcp({ 'server-url': serverUrl, output: outputFile, check: true })
      ).rejects.toThrow(AbortFlowError);
      expect(readFileSync(outputFile, 'utf-8')).toBe(stale);
    } finally {
      rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('clears lists the server no longer reports, and --check flags them as stale', async () => {
    const emptyToolsServer = createServer(async (request, response) => {
      const mcpServer = new McpServer(
        { name: 'cafe-mcp', version: '3.2.1' },
        { capabilities: { tools: {} } }
      );
      mcpServer.setRequestHandler(ListToolsRequestSchema, () => ({ tools: [] }));
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      response.on('close', () => {
        transport.close();
        mcpServer.close();
      });
      await mcpServer.connect(transport);
      await transport.handleRequest(request, response);
    });
    await new Promise<void>((resolve) => emptyToolsServer.listen(0, '127.0.0.1', resolve));
    const emptyToolsServerUrl = `http://127.0.0.1:${
      (emptyToolsServer.address() as AddressInfo).port
    }/mcp`;
    const outputDir = mkdtempSync(join(tmpdir(), 'introspect-mcp-'));
    const outputFile = join(outputDir, 'openapi.yaml');
    writeFileSync(
      outputFile,
      outdent`
        openapi: 3.1.0
        info:
          title: Cafe API
          version: 2.0.0
        servers:
          - url: ${emptyToolsServerUrl}
        paths: {}
        x-mcp:
          tools:
            - name: removed/tool
              description: No longer reported by the server.
          prompts:
            - name: removed-prompt
      ` + '\n',
      'utf-8'
    );
    try {
      await expect(
        runIntrospectMcp({ 'server-url': emptyToolsServerUrl, output: outputFile, check: true })
      ).rejects.toThrow(AbortFlowError);

      await runIntrospectMcp({ 'server-url': emptyToolsServerUrl, output: outputFile });
      const written = readFileSync(outputFile, 'utf-8').replaceAll(
        emptyToolsServerUrl,
        '<server-url>'
      );
      expect(written).toMatchInlineSnapshot(`
        "openapi: 3.1.0
        info:
          title: Cafe API
          version: 2.0.0
        servers:
          - url: <server-url>
        paths: {}
        x-mcp:
          tools: []
          protocolVersion: '2025-11-25'
          servers:
            - url: <server-url>
          capabilities:
            tools: {}
        "
      `);
    } finally {
      rmSync(outputDir, { recursive: true, force: true });
      await new Promise((resolve) => emptyToolsServer.close(resolve));
    }
  });

  it('falls back to the legacy HTTP+SSE transport when streamable HTTP is not supported', async () => {
    const sseTransports = new Map<string, SSEServerTransport>();
    const sseHttpServer = createServer(async (request, response) => {
      const requestUrl = new URL(request.url ?? '/', 'http://localhost');
      if (request.method === 'GET' && requestUrl.pathname === '/sse') {
        const transport = new SSEServerTransport('/messages', response);
        sseTransports.set(transport.sessionId, transport);
        await buildMcpServer().connect(transport);
      } else if (request.method === 'POST' && requestUrl.pathname === '/messages') {
        const transport = sseTransports.get(requestUrl.searchParams.get('sessionId') ?? '');
        await transport?.handlePostMessage(request, response);
      } else {
        response.writeHead(405).end();
      }
    });
    await new Promise<void>((resolve) => sseHttpServer.listen(0, '127.0.0.1', resolve));
    const sseServerUrl = `http://127.0.0.1:${(sseHttpServer.address() as AddressInfo).port}/sse`;
    const outputDir = mkdtempSync(join(tmpdir(), 'introspect-mcp-'));
    const outputFile = join(outputDir, 'openapi.yaml');
    try {
      await runIntrospectMcp({ 'server-url': sseServerUrl, output: outputFile });

      const document = parseYaml(readFileSync(outputFile, 'utf-8')) as Record<string, any>;
      expect(document['x-mcp'].servers).toEqual([{ url: sseServerUrl }]);
      expect(document.servers).toBeUndefined();
      expect(document['x-mcp'].tools.map((tool: { name: string }) => tool.name)).toEqual([
        'orders/create',
        'menu/list',
      ]);
      expect(document['x-mcp'].protocolVersion).toBeDefined();
    } finally {
      rmSync(outputDir, { recursive: true, force: true });
      await Promise.all([...sseTransports.values()].map((transport) => transport.close()));
      await new Promise((resolve) => sseHttpServer.close(resolve));
    }
  });
});
