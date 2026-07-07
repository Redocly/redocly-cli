import { isPlainObject } from '@redocly/openapi-core';

import { selectTrafficParser } from '../drift/log-formats/registry.js';
import type { NormalizedHttpMessage, TrafficFormat } from '../drift/types/index.js';
import { listFilesRecursively } from '../drift/utils/files.js';
import { getPathWithoutTrailingSlash, normalizeContentType } from '../drift/utils/http.js';
import { normalizeServerPrefix, resolvePathForServer } from '../drift/utils/server.js';
import { HTTP_METHODS, templatizePath } from './generator.js';

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
  /** Maximum samples kept per distinct method + path template + status + body shape. */
  perGroup?: number;
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
 * Coarse signature of a body's top-level shape, so that exchanges carrying
 * different payload variants of the same operation land in different sample
 * groups and each variant reaches the AI.
 */
function shapeSignature(message: NormalizedHttpMessage | undefined): string {
  if (!message) {
    return '';
  }
  const value = message.bodyJson;
  if (value === undefined) {
    return message.bodyText ? normalizeContentType(message.contentType) || 'text' : '';
  }
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return `array<${value.length > 0 ? shapeOfValue(value[0]) : ''}>`;
  }
  return shapeOfValue(value);
}

function shapeOfValue(value: unknown): string {
  if (isPlainObject(value)) {
    return Object.keys(value).sort().join(',');
  }
  return value === null ? 'null' : typeof value;
}

/**
 * Re-read the traffic to collect a small, representative set of concrete
 * exchanges. The deterministic generator only retains merged schemas; the AI
 * benefits from seeing real request/response payloads to narrow the hypothesis.
 *
 * Exchanges are grouped by method + templatized path + status + body shape, and
 * the result is filled round-robin across groups, so every operation (and every
 * observed body variant) is represented before any group gets a second sample.
 */
export async function collectTrafficSamples(
  options: CollectSamplesOptions
): Promise<TrafficSample[]> {
  const perGroup = options.perGroup ?? 2;
  const total = options.total ?? 40;
  const maxBodyChars = options.maxBodyChars ?? 2000;
  const server = normalizeServerPrefix(options.server);

  const trafficFiles = await listFilesRecursively(options.trafficPath);

  const groups = new Map<string, TrafficSample[]>();
  let fullGroups = 0;
  const saturated = () => groups.size >= total && fullGroups >= groups.size;

  for (const trafficFile of trafficFiles) {
    if (saturated()) {
      break;
    }
    const parser = await selectTrafficParser(trafficFile, options.format);
    if (!parser) {
      continue;
    }

    for await (const exchange of parser.parse(trafficFile)) {
      if (saturated()) {
        break;
      }
      const method = exchange.request.method.toUpperCase();
      if (!HTTP_METHODS.has(method.toLowerCase())) {
        continue;
      }
      let rawPath = exchange.request.path || '/';
      if (server) {
        const serverRelativePath = resolvePathForServer(exchange.request, server);
        if (serverRelativePath === undefined) {
          continue;
        }
        rawPath = serverRelativePath;
      }
      const path = getPathWithoutTrailingSlash(rawPath);
      const { template } = templatizePath(path);
      const status = exchange.response?.status;
      const shape = `${shapeSignature(exchange.request)}→${shapeSignature(exchange.response)}`;
      const key = `${method} ${template} ${status ?? ''} ${shape}`;

      let group = groups.get(key);
      if (!group) {
        if (groups.size >= total) {
          continue;
        }
        group = [];
        groups.set(key, group);
      }
      if (group.length >= perGroup) {
        continue;
      }
      group.push({
        method,
        path,
        query: exchange.request.query.toString(),
        status,
        requestContentType: exchange.request.contentType,
        requestBody: snapshotBody(exchange.request, maxBodyChars),
        responseContentType: exchange.response?.contentType,
        responseBody: exchange.response ? snapshotBody(exchange.response, maxBodyChars) : undefined,
      });
      if (group.length === perGroup) {
        fullGroups += 1;
      }
    }
  }

  const samples: TrafficSample[] = [];
  for (let round = 0; round < perGroup && samples.length < total; round++) {
    for (const group of groups.values()) {
      if (samples.length >= total) {
        break;
      }
      if (group[round]) {
        samples.push(group[round]);
      }
    }
  }
  return samples;
}
