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

function buildUrl(record: JsonNode, request: JsonNode): { url?: string; schemeKnown?: boolean } {
  const directUrl = coerceString(
    request?.url ?? request?.uri ?? request?.requestUrl ?? record?.url
  );
  if (directUrl) {
    return { url: directUrl };
  }

  const host = coerceString(request?.host ?? request?.headers?.host ?? record?.host);
  const path = coerceString(request?.path ?? record?.path ?? request?.pathname);
  const explicitScheme = coerceString(request?.scheme ?? record?.scheme);

  if (host && path) {
    return {
      url: `${explicitScheme ?? 'http'}://${host}${path}`,
      schemeKnown: Boolean(explicitScheme),
    };
  }

  return { url: path, schemeKnown: Boolean(explicitScheme) };
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

  const { url, schemeKnown } = buildUrl(record, request);

  return createNormalizedExchange(
    {
      method: coerceString(
        request?.method ?? request?.httpMethod ?? record?.method ?? record?.httpMethod
      ),
      url,
      schemeKnown,
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

    const lastNewlineIndex = probe.lastIndexOf('\n');
    if (lastNewlineIndex === -1) {
      return false;
    }

    const firstLine = probe
      .slice(0, lastNewlineIndex)
      .split('\n')
      .map((line) => line.trim())
      .find(Boolean);

    if (!firstLine?.startsWith('{') || !firstLine.endsWith('}')) {
      return false;
    }

    try {
      JSON.parse(firstLine);
      return true;
    } catch {
      return false;
    }
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
