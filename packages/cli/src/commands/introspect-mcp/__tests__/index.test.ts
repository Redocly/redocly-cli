import { Server as McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server as HttpServer } from 'node:http';
import { type AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { outdent } from 'outdent';

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

let httpServer: HttpServer;
let serverUrl: string;
let lastAuthHeader: string | string[] | undefined;

// A stateless Streamable HTTP MCP server: every request gets a fresh server and transport.
beforeAll(async () => {
  httpServer = createServer(async (request, response) => {
    lastAuthHeader = request.headers['x-cafe-auth'] ?? lastAuthHeader;
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

function runIntrospectMcp(outputFile: string, header?: string[]) {
  return handleIntrospectMcp({
    argv: { 'server-url': serverUrl, output: outputFile, header },
    version: '0.0.0',
  } as CommandArgs<IntrospectMcpCommandArgv>);
}

describe('handleIntrospectMcp', () => {
  it('creates an OpenAPI description with the x-mcp extension from a live MCP server', async () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'introspect-mcp-'));
    const outputFile = join(outputDir, 'openapi.yaml');
    try {
      await runIntrospectMcp(outputFile, ['X-Cafe-Auth: secret-token']);

      expect(lastAuthHeader).toBe('secret-token');
      const written = readFileSync(outputFile, 'utf-8').replaceAll(serverUrl, '<server-url>');
      expect(written).toMatchInlineSnapshot(`
        "openapi: 3.1.0
        info:
          title: cafe-mcp
          description: Manage the cafe menu and orders.
          version: 3.2.1
        paths: {}
        servers:
          - url: <server-url>
        x-mcp:
          protocolVersion: '2025-11-25'
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
      await runIntrospectMcp(outputFile);

      const written = readFileSync(outputFile, 'utf-8').replaceAll(serverUrl, '<server-url>');
      expect(written).toMatchInlineSnapshot(`
        "openapi: 3.1.0
        info:
          title: Cafe API
          version: 2.0.0
        servers:
          - url: https://api.cafe.example.com
          - url: <server-url>
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
});
