import path from 'node:path';

import type { NormalizedExchange, TrafficParser } from '../types/index.js';
import {
  coerceNumber,
  coerceString,
  createNormalizedExchange,
  pickHeaderContentType,
  streamNdjsonObjects,
  type JsonNode,
} from './helpers.js';

function getRequestCandidate(record: JsonNode): JsonNode {
  return record?.request ?? record?.req ?? record?.httpRequest ?? record?.http?.request ?? record;
}

function getResponseCandidate(record: JsonNode): JsonNode {
  return record?.response ?? record?.res ?? record?.httpResponse ?? record?.http?.response;
}

function buildUrl(record: JsonNode, request: JsonNode): string | undefined {
  const directUrl = coerceString(
    request?.url ?? request?.uri ?? request?.requestUrl ?? record?.url
  );
  if (directUrl) {
    return directUrl;
  }

  const host = coerceString(request?.host ?? request?.headers?.host ?? record?.host);
  const path = coerceString(request?.path ?? record?.path ?? request?.pathname);
  const scheme = coerceString(request?.scheme ?? record?.scheme ?? 'http');

  if (host && path) {
    return `${scheme}://${host}${path}`;
  }

  return path;
}

function normalizeGenericRecord(
  record: JsonNode,
  index: number,
  source: string
): NormalizedExchange | null {
  const request = getRequestCandidate(record);
  const response = getResponseCandidate(record);

  const requestBody =
    request?.body ?? request?.bodyText ?? request?.payload ?? request?.data ?? request?.rawBody;

  const responseBody =
    response?.body ??
    response?.bodyText ??
    response?.payload ??
    response?.data ??
    response?.rawBody;

  return createNormalizedExchange(
    {
      method: coerceString(
        request?.method ?? request?.httpMethod ?? record?.method ?? record?.httpMethod
      ),
      url: buildUrl(record, request),
      requestHeaders: request?.headers,
      requestBody,
      requestContentType: pickHeaderContentType(request?.headers),
      responseStatus: coerceNumber(
        response?.status ?? response?.statusCode ?? record?.status ?? record?.statusCode
      ),
      responseHeaders: response?.headers,
      responseBody,
      responseContentType: pickHeaderContentType(response?.headers),
      startedAt: coerceString(record?.startedAt ?? record?.timestamp ?? record?.time),
      raw: record,
    },
    index,
    source
  );
}

export class NdjsonTrafficParser implements TrafficParser {
  public readonly id = 'ndjson' as const;

  public canParse(filePath: string, probe: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.ndjson' || ext === '.jsonl' || ext === '.jsonlines') {
      return true;
    }

    const normalizedProbe = probe.trim();
    return normalizedProbe.startsWith('{') && normalizedProbe.includes('\n');
  }

  public async *parse(filePath: string): AsyncIterable<NormalizedExchange> {
    let index = 0;
    for await (const record of streamNdjsonObjects(filePath)) {
      const normalized = normalizeGenericRecord(record, index, filePath);
      if (normalized) {
        yield normalized;
      }
      index += 1;
    }
  }
}
