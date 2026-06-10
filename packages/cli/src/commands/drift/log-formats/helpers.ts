import { isPlainObject } from '@redocly/openapi-core';
import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';

import type { NormalizedExchange, NormalizedRequest, NormalizedResponse } from '../types/index.js';
import { normalizeHeaders, parseJsonBodyIfPresent, parseUrl, isJsonMime } from '../utils/http.js';

/**
 * Loosely-typed view of parsed JSON used by traffic parsers. Every property
 * access yields another node so deep optional chains type-check; leaf values are
 * always funneled through the `coerce*` helpers, which accept `unknown`.
 */
export interface JsonNode {
  [key: string]: JsonNode;
}

export interface ExchangeSeed {
  method?: string;
  url?: string;
  requestHeaders?: unknown;
  requestBody?: unknown;
  requestContentType?: string;
  responseStatus?: number;
  responseStatusText?: string;
  responseHeaders?: unknown;
  responseBody?: unknown;
  responseContentType?: string;
  startedAt?: string;
  raw?: unknown;
}

export function coerceString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (Buffer.isBuffer(value)) {
    return value.toString('utf8');
  }

  if (isPlainObject(value) || Array.isArray(value)) {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

export function coerceNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

export function decodeBody(value: unknown, encoding?: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (encoding === 'base64' && typeof value === 'string') {
    try {
      return Buffer.from(value, 'base64').toString('utf8');
    } catch {
      return value;
    }
  }

  return coerceString(value);
}

export function createNormalizedExchange(
  seed: ExchangeSeed,
  index: number,
  source: string
): NormalizedExchange | null {
  const method = seed.method?.toUpperCase();
  const url = seed.url;

  if (!method || !url) {
    return null;
  }

  const parsedUrl = parseUrl(url);
  const requestHeaders = normalizeHeaders(seed.requestHeaders);
  const requestContentType = seed.requestContentType ?? requestHeaders['content-type'];
  const requestBodyText = decodeBody(seed.requestBody);

  const request: NormalizedRequest = {
    method,
    url: parsedUrl.toString(),
    path: parsedUrl.pathname,
    query: parsedUrl.searchParams,
    protocol: parsedUrl.protocol,
    host: parsedUrl.host || undefined,
    headers: requestHeaders,
    contentType: requestContentType,
    bodyText: requestBodyText,
    bodyJson: parseJsonBodyIfPresent(requestContentType, requestBodyText),
  };

  let response: NormalizedResponse | undefined;
  const responseStatus = seed.responseStatus;
  if (responseStatus !== undefined) {
    const responseHeaders = normalizeHeaders(seed.responseHeaders);
    const responseContentType = seed.responseContentType ?? responseHeaders['content-type'];
    const responseBodyText = decodeBody(seed.responseBody);

    response = {
      status: responseStatus,
      statusText: seed.responseStatusText,
      headers: responseHeaders,
      contentType: responseContentType,
      bodyText: responseBodyText,
      bodyJson: parseJsonBodyIfPresent(responseContentType, responseBodyText),
    };
  }

  return {
    index,
    source,
    startedAt: seed.startedAt,
    request,
    response,
    raw: seed.raw,
  };
}

export async function* streamNdjsonObjects(filePath: string): AsyncIterable<JsonNode> {
  const readStream = createReadStream(filePath, { encoding: 'utf8' });
  const reader = createInterface({ input: readStream, crlfDelay: Infinity });

  for await (const line of reader) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (isPlainObject(parsed)) {
        yield parsed as JsonNode;
      }
    } catch {
      // skip invalid lines by design to keep ingestion resilient
    }
  }
}

/**
 * Read and parse a whole JSON file, then yield items from the array located at
 * `arrayPath` (dot-separated, e.g. "log.entries"). When `arrayPath` is omitted
 * the document root is expected to be the array.
 *
 * Note: this loads the file fully into memory. For the experimental `drift`
 * command this trade-off keeps the dependency footprint minimal (no streaming
 * JSON parser). Use the NDJSON format for very large captures.
 */
export async function* iterateJsonArray(
  filePath: string,
  arrayPath?: string
): AsyncIterable<JsonNode> {
  const content = await readFile(filePath, 'utf8');
  let value: unknown = JSON.parse(content);

  if (arrayPath) {
    for (const key of arrayPath.split('.')) {
      value = isPlainObject(value) ? value[key] : undefined;
    }
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (isPlainObject(item)) {
        yield item as JsonNode;
      }
    }
  }
}

export function pickHeaderContentType(headers: unknown): string | undefined {
  const normalized = normalizeHeaders(headers);
  return normalized['content-type'];
}

export function isLikelyJsonContent(contentType: string | undefined): boolean {
  return isJsonMime(contentType);
}
