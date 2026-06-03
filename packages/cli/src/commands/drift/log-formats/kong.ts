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

function buildKongUrl(record: JsonNode): string | undefined {
  const request = record?.request ?? {};

  const directUrl = coerceString(request.url ?? request.uri);
  if (directUrl) {
    return directUrl;
  }

  const host = coerceString(request.host ?? request.headers?.host);
  const path = coerceString(request.path ?? request.request_uri ?? request.uri ?? '/');
  const scheme = coerceString(request.scheme ?? request.forwarded_proto ?? 'http');

  if (host && path) {
    return `${scheme}://${host}${path}`;
  }

  if (path) {
    return path;
  }

  return undefined;
}

function normalizeKongRecord(
  record: JsonNode,
  index: number,
  source: string
): NormalizedExchange | null {
  const request = record?.request ?? record?.req ?? record?.http?.request;
  if (!request) {
    return null;
  }

  const response = record?.response ?? record?.res ?? record?.http?.response;

  const responseBody = response?.body ?? response?.raw_body ?? response?.payload ?? response?.data;

  const requestBody = request?.body ?? request?.raw_body ?? request?.payload ?? request?.data;

  return createNormalizedExchange(
    {
      method: coerceString(request?.method ?? request?.http_method),
      url: buildKongUrl(record),
      requestHeaders: request?.headers,
      requestBody,
      requestContentType: pickHeaderContentType(request?.headers),
      responseStatus: coerceNumber(response?.status ?? response?.statusCode),
      responseHeaders: response?.headers,
      responseBody,
      responseContentType: pickHeaderContentType(response?.headers),
      startedAt: coerceString(record?.started_at ?? record?.startedAt ?? record?.timestamp),
      raw: record,
    },
    index,
    source
  );
}

export class KongTrafficParser implements TrafficParser {
  public readonly id = 'kong' as const;

  public canParse(filePath: string, probe: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.kong') {
      return true;
    }

    const lowerProbe = probe.toLowerCase();
    return (
      lowerProbe.includes('"latencies"') ||
      (lowerProbe.includes('"request"') &&
        lowerProbe.includes('"response"') &&
        lowerProbe.includes('"route"'))
    );
  }

  public async *parse(filePath: string): AsyncIterable<NormalizedExchange> {
    const firstChar = (await readProbe(filePath, 16)).trim().slice(0, 1);

    let index = 0;

    if (firstChar === '[') {
      for await (const record of iterateJsonArray(filePath)) {
        const normalized = normalizeKongRecord(record, index, filePath);
        if (normalized) {
          yield normalized;
        }
        index += 1;
      }
      return;
    }

    for await (const record of streamNdjsonObjects(filePath)) {
      const normalized = normalizeKongRecord(record, index, filePath);
      if (normalized) {
        yield normalized;
      }
      index += 1;
    }
  }
}
