import { isPlainObject } from '@redocly/openapi-core';
import type { Cookie, Entry, Header, PostData, QueryString } from 'har-format';
import {
  createServer,
  STATUS_CODES,
  type IncomingMessage,
  type OutgoingHttpHeaders,
  type Server,
  type ServerResponse,
} from 'node:http';
import { type AddressInfo } from 'node:net';
import { request as undiciRequest } from 'undici';

import { createNormalizedExchange } from '../drift/log-formats/helpers.js';
import type { NormalizedExchange } from '../drift/types/index.js';
import { isJsonMime } from '../drift/utils/http.js';

const HTTP_METHODS = [
  'GET',
  'HEAD',
  'POST',
  'PUT',
  'DELETE',
  'CONNECT',
  'OPTIONS',
  'TRACE',
  'PATCH',
] as const;

type HttpMethod = (typeof HTTP_METHODS)[number];

function toHttpMethod(value: string | undefined): HttpMethod {
  const upper = (value ?? 'GET').toUpperCase();
  return HTTP_METHODS.find((method) => method === upper) ?? 'GET';
}

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

export interface CapturedExchange {
  exchange: NormalizedExchange;
  harEntry: Entry;
}

export interface ProxyServerOptions {
  target: string;
  port: number;
  host: string;
  onExchange: (captured: CapturedExchange) => void | Promise<void>;
  onError: (error: Error) => void;
}

export interface RunningProxyServer {
  url: string;
  close: () => Promise<void>;
}

function readRequestBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function toForwardRequestHeaders(req: IncomingMessage): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined) {
      continue;
    }
    const lower = name.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower) || lower === 'host' || lower === 'content-length') {
      continue;
    }
    // Force an identity response so captured bodies are human-readable.
    if (lower === 'accept-encoding') {
      continue;
    }
    headers[name] = Array.isArray(value) ? value.join(', ') : value;
  }
  return headers;
}

function toClientResponseHeaders(
  headers: Record<string, string | string[] | undefined>
): OutgoingHttpHeaders {
  const result: OutgoingHttpHeaders = {};
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined || HOP_BY_HOP_HEADERS.has(name.toLowerCase())) {
      continue;
    }
    result[name] = value;
  }
  return result;
}

function rawHeadersToHarHeaders(rawHeaders: string[]): Header[] {
  const headers: Header[] = [];
  for (let index = 0; index < rawHeaders.length - 1; index += 2) {
    headers.push({ name: rawHeaders[index], value: rawHeaders[index + 1] });
  }
  return headers;
}

function responseHeadersToHarHeaders(
  headers: Record<string, string | string[] | undefined>
): Header[] {
  const result: Header[] = [];
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        result.push({ name, value: item });
      }
      continue;
    }
    result.push({ name, value });
  }
  return result;
}

function toQueryString(url: URL): QueryString[] {
  const query: QueryString[] = [];
  for (const [name, value] of url.searchParams.entries()) {
    query.push({ name, value });
  }
  return query;
}

function parseCookieHeader(cookieHeader: string | undefined): Cookie[] {
  if (!cookieHeader) {
    return [];
  }
  const cookies: Cookie[] = [];
  for (const pair of cookieHeader.split(';')) {
    const separatorIndex = pair.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }
    const name = pair.slice(0, separatorIndex).trim();
    const value = pair.slice(separatorIndex + 1).trim();
    if (name) {
      cookies.push({ name, value });
    }
  }
  return cookies;
}

function isTextualContentType(contentType: string | undefined): boolean {
  if (!contentType) {
    return true;
  }
  if (isJsonMime(contentType)) {
    return true;
  }
  const mime = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
  return (
    mime.startsWith('text/') ||
    mime === 'application/xml' ||
    mime === 'application/x-www-form-urlencoded' ||
    mime.endsWith('+xml')
  );
}

function buildBodyPayload(
  body: Buffer,
  contentType: string | undefined
): { text?: string; encoding?: 'base64'; size: number } {
  if (body.length === 0) {
    return { size: 0 };
  }
  if (isTextualContentType(contentType)) {
    return { text: body.toString('utf8'), size: body.length };
  }
  return { text: body.toString('base64'), encoding: 'base64', size: body.length };
}

function buildPostData(body: Buffer, contentType: string | undefined): PostData | undefined {
  if (body.length === 0) {
    return undefined;
  }
  const payload = buildBodyPayload(body, contentType);
  return {
    mimeType: contentType ?? 'application/octet-stream',
    text: payload.text ?? '',
    ...(payload.encoding ? { encoding: payload.encoding } : {}),
  };
}

export function startProxyServer(options: ProxyServerOptions): Promise<RunningProxyServer> {
  const targetUrl = new URL(options.target);
  let exchangeIndex = 0;
  const nextExchangeIndex = () => exchangeIndex++;

  const server: Server = createServer((req, res) => {
    void handleRequest(req, res, targetUrl, options, nextExchangeIndex);
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port, options.host, () => {
      server.removeListener('error', reject);
      const address = server.address();
      const boundPort = isPlainObject<AddressInfo>(address) ? address.port : options.port;
      resolve({
        url: `http://${options.host}:${boundPort}`,
        close: () =>
          new Promise<void>((resolveClose, rejectClose) => {
            server.close((error) => (error ? rejectClose(error) : resolveClose()));
          }),
      });
    });
  });
}

function buildForwardUrl(requestUrl: string, targetUrl: URL): URL {
  const requested = new URL(requestUrl, targetUrl);
  const basePath = targetUrl.pathname.endsWith('/')
    ? targetUrl.pathname.slice(0, -1)
    : targetUrl.pathname;
  const requestPath = requested.pathname;
  const alreadyPrefixed = requestPath === basePath || requestPath.startsWith(`${basePath}/`);

  const forwardUrl = new URL(targetUrl.toString());
  forwardUrl.pathname = basePath && !alreadyPrefixed ? `${basePath}${requestPath}` : requestPath;
  forwardUrl.search = requested.search;
  return forwardUrl;
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  targetUrl: URL,
  options: ProxyServerOptions,
  nextExchangeIndex: () => number
): Promise<void> {
  const startedAt = new Date();
  const method = toHttpMethod(req.method);
  const forwardUrl = buildForwardUrl(req.url ?? '/', targetUrl);

  let captured: CapturedExchange | null = null;
  try {
    const requestBody = await readRequestBody(req);
    const hasBody = method !== 'GET' && method !== 'HEAD' && requestBody.length > 0;

    const upstream = await undiciRequest(forwardUrl, {
      method,
      headers: toForwardRequestHeaders(req),
      body: hasBody ? requestBody : undefined,
    });

    const responseBody = Buffer.from(await upstream.body.arrayBuffer());

    res.writeHead(upstream.statusCode, toClientResponseHeaders(upstream.headers));
    res.end(responseBody);

    const elapsedMs = Date.now() - startedAt.getTime();
    captured = buildCapturedExchange({
      index: nextExchangeIndex(),
      method,
      forwardUrl,
      req,
      requestBody,
      statusCode: upstream.statusCode,
      responseHeaders: upstream.headers,
      responseBody,
      startedAt,
      elapsedMs,
    });
  } catch (error) {
    options.onError(error as Error);
    if (!res.writableEnded) {
      if (!res.headersSent) {
        res.writeHead(502, { 'content-type': 'text/plain' });
      }
      res.end(`Proxy error: ${(error as Error).message}`);
    }
    return;
  }

  if (captured) {
    try {
      await options.onExchange(captured);
    } catch (error) {
      options.onError(error as Error);
    }
  }
}

function buildCapturedExchange(params: {
  index: number;
  method: string;
  forwardUrl: URL;
  req: IncomingMessage;
  requestBody: Buffer;
  statusCode: number;
  responseHeaders: Record<string, string | string[] | undefined>;
  responseBody: Buffer;
  startedAt: Date;
  elapsedMs: number;
}): CapturedExchange | null {
  const requestContentType = singleHeader(params.req.headers['content-type']);
  const responseContentType = singleHeader(params.responseHeaders['content-type']);

  const exchange = createNormalizedExchange(
    {
      method: params.method,
      url: params.forwardUrl.toString(),
      requestHeaders: params.req.headers,
      requestBody: params.requestBody,
      requestContentType,
      responseStatus: params.statusCode,
      responseHeaders: params.responseHeaders,
      responseBody: params.responseBody,
      responseContentType,
      startedAt: params.startedAt.toISOString(),
    },
    params.index,
    '(proxy)'
  );

  if (!exchange) {
    return null;
  }

  const responsePayload = buildBodyPayload(params.responseBody, responseContentType);

  const harEntry: Entry = {
    startedDateTime: params.startedAt.toISOString(),
    time: params.elapsedMs,
    request: {
      method: params.method,
      url: params.forwardUrl.toString(),
      httpVersion: `HTTP/${params.req.httpVersion}`,
      cookies: parseCookieHeader(singleHeader(params.req.headers.cookie)),
      headers: rawHeadersToHarHeaders(params.req.rawHeaders),
      queryString: toQueryString(params.forwardUrl),
      postData: buildPostData(params.requestBody, requestContentType),
      headersSize: -1,
      bodySize: params.requestBody.length,
    },
    response: {
      status: params.statusCode,
      statusText: STATUS_CODES[params.statusCode] ?? '',
      httpVersion: 'HTTP/1.1',
      cookies: [],
      headers: responseHeadersToHarHeaders(params.responseHeaders),
      content: {
        size: responsePayload.size,
        mimeType: responseContentType ?? 'application/octet-stream',
        ...(responsePayload.text !== undefined ? { text: responsePayload.text } : {}),
        ...(responsePayload.encoding ? { encoding: responsePayload.encoding } : {}),
      },
      redirectURL: singleHeader(params.responseHeaders.location) ?? '',
      headersSize: -1,
      bodySize: params.responseBody.length,
    },
    cache: {},
    timings: { send: 0, wait: params.elapsedMs, receive: 0 },
  };

  return { exchange, harEntry };
}

function singleHeader(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}
