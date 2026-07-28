import { isPlainObject } from '@redocly/openapi-core';
import path from 'node:path';

import type { TrafficParser, NormalizedExchange } from '../types/index.js';
import { normalizeContentType } from '../utils/http.js';
import {
  createNormalizedExchange,
  coerceString,
  coerceNumber,
  decodeBody,
  iterateJsonArray,
  type JsonNode,
} from './helpers.js';

function formParamsToBody(mimeType: string | undefined, params: unknown): string | undefined {
  if (normalizeContentType(mimeType) !== 'application/x-www-form-urlencoded') {
    return undefined;
  }

  if (!Array.isArray(params)) {
    return undefined;
  }

  const searchParams = new URLSearchParams();
  for (const param of params) {
    if (!isPlainObject(param)) {
      continue;
    }

    const name = coerceString(param.name);
    if (name === undefined) {
      continue;
    }

    searchParams.append(name, coerceString(param.value) ?? '');
  }

  return searchParams.size > 0 ? searchParams.toString() : undefined;
}

function normalizeHarEntry(
  entry: JsonNode,
  index: number,
  source: string
): NormalizedExchange | null {
  const request = entry?.request;
  const response = entry?.response;

  if (!request) {
    return null;
  }

  const postData = request?.postData;
  const requestContentType = coerceString(postData?.mimeType);
  const requestBody = postData?.text ?? formParamsToBody(requestContentType, postData?.params);
  const requestEncoding = coerceString(postData?.encoding);
  const responseBody = response?.content?.text;
  const responseEncoding = coerceString(response?.content?.encoding);
  const responseStatus = coerceNumber(response?.status);

  return createNormalizedExchange(
    {
      method: coerceString(request?.method),
      url: coerceString(request?.url),
      requestHeaders: request?.headers,
      requestBody: decodeBody(requestBody, requestEncoding),
      requestContentType,
      responseStatus: responseStatus === 0 ? undefined : responseStatus,
      responseStatusText: coerceString(response?.statusText),
      responseHeaders: response?.headers,
      responseBody: decodeBody(responseBody, responseEncoding),
      responseContentType: coerceString(response?.content?.mimeType),
      startedAt: coerceString(entry?.startedDateTime),
      raw: entry,
    },
    index,
    source
  );
}

export class HarTrafficParser implements TrafficParser {
  public readonly id = 'har' as const;

  public canParse(filePath: string, probe: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.har') {
      return true;
    }

    const normalizedProbe = probe.toLowerCase();
    return normalizedProbe.includes('"log"') && normalizedProbe.includes('"entries"');
  }

  public async *parse(filePath: string): AsyncIterable<NormalizedExchange> {
    let index = 0;
    for await (const entry of iterateJsonArray(filePath, 'log.entries')) {
      const exchange = normalizeHarEntry(entry, index, filePath);
      if (exchange) {
        yield exchange;
      }
      index += 1;
    }
  }
}
