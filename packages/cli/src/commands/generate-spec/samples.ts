import { selectTrafficParser } from '../drift/log-formats/registry.js';
import type { NormalizedHttpMessage, TrafficFormat } from '../drift/types/index.js';
import { listFilesRecursively } from '../drift/utils/files.js';
import { getPathWithoutTrailingSlash } from '../drift/utils/http.js';
import { normalizeServerPrefix, resolvePathForServer } from '../drift/utils/server.js';

export interface TrafficSample {
  method: string;
  path: string;
  query: string;
  status?: number;
  requestContentType?: string;
  requestBody?: string;
  responseContentType?: string;
  responseBody?: string;
}

export interface CollectSamplesOptions {
  trafficPath: string;
  format: TrafficFormat;
  server?: string;
  /** Maximum samples kept per distinct method + path + status combination. */
  perEndpoint?: number;
  /** Hard cap on the total number of samples handed to the AI. */
  total?: number;
  /** Maximum characters retained from any single body before truncation. */
  maxBodyChars?: number;
}

function snapshotBody(message: NormalizedHttpMessage, maxBodyChars: number): string | undefined {
  let text: string | undefined;
  if (message.bodyJson !== undefined) {
    try {
      text = JSON.stringify(message.bodyJson);
    } catch {
      text = undefined;
    }
  }
  text ??= message.bodyText;
  if (!text) {
    return undefined;
  }
  const trimmed = text.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.length > maxBodyChars ? `${trimmed.slice(0, maxBodyChars)}…[truncated]` : trimmed;
}

/**
 * Re-read the traffic to collect a small, representative set of concrete
 * exchanges. The deterministic generator only retains merged schemas; the AI
 * benefits from seeing real request/response payloads to narrow the hypothesis.
 */
export async function collectTrafficSamples(
  options: CollectSamplesOptions
): Promise<TrafficSample[]> {
  const perEndpoint = options.perEndpoint ?? 2;
  const total = options.total ?? 40;
  const maxBodyChars = options.maxBodyChars ?? 2000;
  const server = normalizeServerPrefix(options.server);

  const trafficFiles = await listFilesRecursively(options.trafficPath);

  const samples: TrafficSample[] = [];
  const seenCounts = new Map<string, number>();

  for (const trafficFile of trafficFiles) {
    if (samples.length >= total) {
      break;
    }
    const parser = await selectTrafficParser(trafficFile, options.format);
    if (!parser) {
      continue;
    }

    for await (const exchange of parser.parse(trafficFile)) {
      if (samples.length >= total) {
        break;
      }
      const method = exchange.request.method.toUpperCase();
      let rawPath = exchange.request.path || '/';
      if (server) {
        const serverRelativePath = resolvePathForServer(exchange.request, server);
        if (serverRelativePath === undefined) {
          continue;
        }
        rawPath = serverRelativePath;
      }
      const path = getPathWithoutTrailingSlash(rawPath);
      const status = exchange.response?.status;
      const key = `${method} ${path} ${status ?? ''}`;
      const seen = seenCounts.get(key) ?? 0;
      if (seen >= perEndpoint) {
        continue;
      }
      seenCounts.set(key, seen + 1);

      samples.push({
        method,
        path,
        query: exchange.request.query.toString(),
        status,
        requestContentType: exchange.request.contentType,
        requestBody: snapshotBody(exchange.request, maxBodyChars),
        responseContentType: exchange.response?.contentType,
        responseBody: exchange.response ? snapshotBody(exchange.response, maxBodyChars) : undefined,
      });
    }
  }

  return samples;
}
