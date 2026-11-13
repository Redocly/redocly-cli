// An HTTP server that runs inside the test process. It answers every request from the
// OpenAPI description with `@redocly/mock-server`, unless the test gives a handler for
// that operation. It records every request, so the test can assert on what a generated
// client sent. A consumer must run asynchronously (`runTsx`, `runCommand`) while the server
// is up: a synchronous spawn blocks the event loop, and the server cannot answer.

import { createMockServer, type MockServerRequestHandler } from '@redocly/mock-server';
import { parseYaml } from '@redocly/openapi-core';
import { readFileSync } from 'node:fs';
import * as http from 'node:http';
import type { AddressInfo } from 'node:net';

export type MockRequest = {
  method: string;
  /** The path without the query string, for example `/orders/42`. */
  path: string;
  /** The path with the query string, as the client sent it. */
  url: string;
  query: Record<string, string>;
  /** Header names in lower case. A repeated header is joined with a comma. */
  headers: Record<string, string>;
  /** Every header line as sent, as `[name, value, name, value, ...]`. */
  rawHeaders: string[];
  body: Buffer | undefined;
  /** The operation in the description that matches the method and path. */
  operationId: string | undefined;
};

type MockResponse = {
  status: number;
  headers?: Record<string, string>;
  /** A Buffer or a string is sent as is. Any other value is sent as JSON. */
  body?: unknown;
};

type MockHandlerContext = {
  request: MockRequest;
  /** The raw response, for a handler that streams. Such a handler returns `undefined`. */
  response: http.ServerResponse;
  /** The response that `@redocly/mock-server` gives from the description. */
  defaultResponse: (extraHeaders?: Record<string, string>) => Promise<MockResponse>;
};

export type MockHandler = (
  context: MockHandlerContext
) => MockResponse | undefined | Promise<MockResponse | undefined>;

export type MockServerOptions = {
  /** Handlers keyed by operationId. */
  handlers?: Record<string, MockHandler>;
  /** Answers every request that no operation handler answers. */
  fallback?: MockHandler;
};

type Operation = { method: string; pathPattern: RegExp; operationId: string };

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

/** Read the operations of the description, with a pattern for each path template. */
function readOperations(spec: string): Operation[] {
  const document = parseYaml(readFileSync(spec, 'utf-8')) as {
    paths?: Record<string, Record<string, { operationId?: string }>>;
  };
  const operations: Operation[] = [];
  for (const [template, pathItem] of Object.entries(document.paths ?? {})) {
    // `/orders/{orderId}` becomes `^/orders/[^/]+$`.
    const escaped = template.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
    const pathPattern = new RegExp('^' + escaped.replace(/\{[^}]+\}/g, '[^/]+') + '$');
    for (const method of HTTP_METHODS) {
      const operationId = pathItem[method]?.operationId;
      if (operationId !== undefined) {
        operations.push({ method: method.toUpperCase(), pathPattern, operationId });
      }
    }
  }
  return operations;
}

async function readBody(request: http.IncomingMessage): Promise<Buffer | undefined> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(chunk as Buffer);
  }
  if (chunks.length === 0) {
    return undefined;
  }
  return Buffer.concat(chunks);
}

function readHeaders(request: http.IncomingMessage): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(request.headers)) {
    if (typeof value === 'string') {
      headers[name] = value;
    } else if (Array.isArray(value)) {
      headers[name] = value.join(',');
    }
  }
  return headers;
}

function writeResponse(response: http.ServerResponse, result: MockResponse): void {
  const headers = { ...result.headers };
  let body: string | Buffer | undefined;
  if (result.body === undefined) {
    body = undefined;
  } else if (typeof result.body === 'string' || Buffer.isBuffer(result.body)) {
    body = result.body;
  } else {
    body = JSON.stringify(result.body);
    if (headers['content-type'] === undefined) {
      headers['content-type'] = 'application/json';
    }
  }
  response.writeHead(result.status, headers);
  response.end(body);
}

/**
 * A mock server for one test file. Start it with `MockServer.start` in `beforeAll`, and
 * close it in `afterAll`. Each test file owns its own server, so the request records of
 * parallel files never mix.
 */
export class MockServer {
  /** Every request the server received, in order. */
  readonly requests: MockRequest[] = [];
  /** Errors that a handler threw. The server answered each one with a 500. */
  readonly handlerErrors: unknown[] = [];

  private readonly server: http.Server;

  private constructor(
    private readonly operations: Operation[],
    private readonly mockHandler: MockServerRequestHandler,
    private readonly options: MockServerOptions
  ) {
    this.server = http.createServer((incoming, response) => {
      void this.handle(incoming, response);
    });
  }

  /** Start a server for `spec` on a free port. */
  static async start(spec: string, options: MockServerOptions = {}): Promise<MockServer> {
    const mockHandler = await createMockServer(spec);
    const mockServer = new MockServer(readOperations(spec), mockHandler, options);
    await new Promise<void>((resolve) => mockServer.server.listen(0, '127.0.0.1', resolve));
    return mockServer;
  }

  get url(): string {
    const { port } = this.server.address() as AddressInfo;
    return `http://127.0.0.1:${port}`;
  }

  /** Forget the recorded requests and errors, for example before the next consumer run. */
  reset(): void {
    this.requests.length = 0;
    this.handlerErrors.length = 0;
  }

  close(): Promise<void> {
    // A held-open stream would keep `close()` waiting, so end every connection first.
    this.server.closeAllConnections();
    return new Promise((resolve) => this.server.close(() => resolve()));
  }

  private async handle(incoming: http.IncomingMessage, response: http.ServerResponse) {
    const url = incoming.url ?? '/';
    const parsedUrl = new URL(url, 'http://localhost');
    const method = incoming.method ?? 'GET';
    const body = await readBody(incoming);
    const request: MockRequest = {
      method,
      path: parsedUrl.pathname,
      url,
      query: Object.fromEntries(parsedUrl.searchParams),
      headers: readHeaders(incoming),
      rawHeaders: incoming.rawHeaders,
      body,
      operationId: this.findOperationId(method, parsedUrl.pathname),
    };
    this.requests.push(request);

    const defaultResponse = async (
      extraHeaders: Record<string, string> = {}
    ): Promise<MockResponse> => {
      const result = await this.mockHandler({
        path: request.path,
        method,
        query: parsedUrl.search !== '' ? parsedUrl.search : undefined,
        headers: { ...request.headers, ...extraHeaders },
        getBody: () => Promise.resolve(body),
      });
      return { status: result.statusCode, headers: result.headers, body: result.body };
    };

    try {
      const result = await this.findHandler(request)({ request, response, defaultResponse });
      if (result !== undefined) {
        writeResponse(response, result);
      }
    } catch (error) {
      this.handlerErrors.push(error);
      if (!response.headersSent) {
        writeResponse(response, { status: 500, body: { title: 'mock handler failed' } });
      }
    }
  }

  private findOperationId(method: string, path: string): string | undefined {
    for (const operation of this.operations) {
      if (operation.method === method && operation.pathPattern.test(path)) {
        return operation.operationId;
      }
    }
    return undefined;
  }

  /** The operation handler, then the fallback, then the response from the description. */
  private findHandler(request: MockRequest): MockHandler {
    const operationHandler =
      request.operationId === undefined ? undefined : this.options.handlers?.[request.operationId];
    if (operationHandler !== undefined) {
      return operationHandler;
    }
    if (this.options.fallback !== undefined) {
      return this.options.fallback;
    }
    return ({ defaultResponse }) => defaultResponse();
  }
}
