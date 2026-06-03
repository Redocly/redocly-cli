import path from 'node:path';

import type { NormalizedExchange, TrafficParser } from '../types/index.js';
import { readProbe } from '../utils/files.js';
import {
  coerceNumber,
  coerceString,
  createNormalizedExchange,
  iterateJsonArray,
  pickHeaderContentType,
  streamNdjsonObjects,
  type JsonNode,
} from './helpers.js';

function parseRequestLine(requestLine: string | undefined): {
  method?: string;
  path?: string;
  protocol?: string;
} {
  if (!requestLine) {
    return {};
  }

  const parts = requestLine.trim().split(/\s+/);
  if (parts.length < 2) {
    return {};
  }

  return {
    method: parts[0],
    path: parts[1],
    protocol: parts[2],
  };
}

function buildUrl(record: JsonNode, request: JsonNode): string | undefined {
  const directUrl = coerceString(
    request?.url ??
      request?.uri ??
      request?.request_uri ??
      record?.url ??
      record?.request_url ??
      record?.absolute_uri
  );

  const requestLine = parseRequestLine(coerceString(record?.request ?? request?.request_line));
  const requestPath =
    coerceString(
      request?.request_uri ?? request?.uri ?? request?.path ?? record?.request_uri ?? record?.uri
    ) ?? requestLine.path;

  if (directUrl?.startsWith('http://') || directUrl?.startsWith('https://')) {
    return directUrl;
  }

  const host = coerceString(
    request?.host ??
      request?.headers?.host ??
      record?.host ??
      record?.http_host ??
      record?.server_name ??
      record?.vhost
  );

  const scheme = coerceString(
    record?.scheme ?? request?.scheme ?? record?.request_scheme ?? 'http'
  );

  if (host && (directUrl || requestPath)) {
    const targetPath = directUrl ?? requestPath;
    if (targetPath?.startsWith('/')) {
      return `${scheme}://${host}${targetPath}`;
    }
    return `${scheme}://${host}/${targetPath}`;
  }

  return directUrl ?? requestPath;
}

function normalizeWebServerRecord(
  record: JsonNode,
  index: number,
  source: string
): NormalizedExchange | null {
  const request = record?.request && typeof record.request === 'object' ? record.request : record;
  const response =
    record?.response && typeof record.response === 'object' ? record.response : record;
  const requestLine = parseRequestLine(coerceString(record?.request));

  const method =
    coerceString(
      request?.method ?? request?.request_method ?? record?.request_method ?? record?.method
    ) ?? requestLine.method;

  const url = buildUrl(record, request);

  return createNormalizedExchange(
    {
      method,
      url,
      requestHeaders:
        request?.headers ?? request?.request_headers ?? record?.request_headers ?? record?.headers,
      requestBody: request?.body ?? request?.request_body ?? record?.request_body ?? record?.body,
      requestContentType: pickHeaderContentType(
        request?.headers ?? request?.request_headers ?? record?.request_headers
      ),
      responseStatus: coerceNumber(
        response?.status ??
          response?.status_code ??
          record?.status ??
          record?.status_code ??
          record?.response_status
      ),
      responseHeaders:
        response?.headers ??
        response?.response_headers ??
        record?.response_headers ??
        record?.headers_out,
      responseBody: response?.body ?? response?.response_body ?? record?.response_body,
      responseContentType: pickHeaderContentType(
        response?.headers ?? response?.response_headers ?? record?.response_headers
      ),
      startedAt: coerceString(
        record?.time_iso8601 ??
          record?.timestamp ??
          record?.time ??
          record?.time_local ??
          record?.['@timestamp']
      ),
      raw: record,
    },
    index,
    source
  );
}

async function* parseJsonFile(filePath: string): AsyncIterable<JsonNode> {
  const firstChar = (await readProbe(filePath, 16)).trim().slice(0, 1);

  if (firstChar === '[') {
    yield* iterateJsonArray(filePath);
    return;
  }

  for await (const record of streamNdjsonObjects(filePath)) {
    yield record;
  }
}

export class NginxJsonTrafficParser implements TrafficParser {
  public readonly id = 'nginx-json' as const;

  public canParse(filePath: string, probe: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    const lowerFilePath = filePath.toLowerCase();
    if (ext === '.ndjson' && lowerFilePath.includes('nginx')) {
      return true;
    }

    const lowerProbe = probe.toLowerCase();
    return (
      lowerProbe.includes('"request_uri"') ||
      lowerProbe.includes('"time_iso8601"') ||
      lowerProbe.includes('"upstream_response_time"') ||
      lowerProbe.includes('"remote_addr"')
    );
  }

  public async *parse(filePath: string): AsyncIterable<NormalizedExchange> {
    let index = 0;
    for await (const record of parseJsonFile(filePath)) {
      const normalized = normalizeWebServerRecord(record, index, filePath);
      if (normalized) {
        yield normalized;
      }
      index += 1;
    }
  }
}

export class ApacheJsonTrafficParser implements TrafficParser {
  public readonly id = 'apache-json' as const;

  public canParse(filePath: string, probe: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    const lowerFilePath = filePath.toLowerCase();
    if (ext === '.ndjson' && lowerFilePath.includes('apache')) {
      return true;
    }

    const lowerProbe = probe.toLowerCase();
    return (
      lowerProbe.includes('"request_method"') ||
      lowerProbe.includes('"request_uri"') ||
      lowerProbe.includes('"vhost"') ||
      lowerProbe.includes('"response_status"')
    );
  }

  public async *parse(filePath: string): AsyncIterable<NormalizedExchange> {
    let index = 0;
    for await (const record of parseJsonFile(filePath)) {
      const normalized = normalizeWebServerRecord(record, index, filePath);
      if (normalized) {
        yield normalized;
      }
      index += 1;
    }
  }
}
