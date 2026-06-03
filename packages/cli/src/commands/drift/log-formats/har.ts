import path from 'node:path';
import type { TrafficParser, NormalizedExchange } from '../types/index.js';
import {
  createNormalizedExchange,
  coerceString,
  coerceNumber,
  decodeBody,
  iterateJsonArray,
} from './helpers.js';

function normalizeHarEntry(entry: any, index: number, source: string): NormalizedExchange | null {
  const request = entry?.request;
  const response = entry?.response;

  if (!request) {
    return null;
  }

  const requestBody = request?.postData?.text;
  const requestEncoding = request?.postData?.encoding;
  const responseBody = response?.content?.text;
  const responseEncoding = response?.content?.encoding;

  return createNormalizedExchange(
    {
      method: coerceString(request?.method),
      url: coerceString(request?.url),
      requestHeaders: request?.headers,
      requestBody: decodeBody(requestBody, requestEncoding),
      requestContentType: request?.postData?.mimeType,
      responseStatus: coerceNumber(response?.status),
      responseHeaders: response?.headers,
      responseBody: decodeBody(responseBody, responseEncoding),
      responseContentType: response?.content?.mimeType,
      startedAt: coerceString(entry?.startedDateTime),
      raw: entry,
    },
    index,
    source,
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
