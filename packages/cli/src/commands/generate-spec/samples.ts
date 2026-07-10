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
  /** Maximum samples kept per distinct status + body shape within an operation. */
  perGroup?: number;
  /** Maximum samples handed to the AI for a single operation. */
  perOperation?: number;
  /** Maximum characters retained from any single body before truncation. */
  maxBodyChars?: number;
}

export function operationSampleKey(method: string, template: string): string {
  return `${method.toUpperCase()} ${template}`;
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
 * exchanges per operation. The deterministic generator only retains merged
 * schemas; the AI benefits from seeing real request/response payloads to
 * narrow the hypothesis.
 *
 * Within an operation, exchanges are grouped by status + body shape and the
 * result is filled round-robin across groups, so every observed payload
 * variant is represented before any group gets a second sample. Keying the
 * result by operation keeps each AI prompt small no matter how large the
 * recorded traffic is.
 */
export async function collectTrafficSamples(
  options: CollectSamplesOptions
): Promise<Map<string, TrafficSample[]>> {
  const perGroup = options.perGroup ?? 2;
  const perOperation = options.perOperation ?? 8;
  const maxBodyChars = options.maxBodyChars ?? 2000;
  const server = normalizeServerPrefix(options.server);

  const trafficFiles = await listFilesRecursively(options.trafficPath);

  const operations = new Map<string, Map<string, TrafficSample[]>>();

  for (const trafficFile of trafficFiles) {
    const parser = await selectTrafficParser(trafficFile, options.format);
    if (!parser) {
      continue;
    }

    for await (const exchange of parser.parse(trafficFile)) {
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

      let groups = operations.get(operationSampleKey(method, template));
      if (!groups) {
        groups = new Map();
        operations.set(operationSampleKey(method, template), groups);
      }
      const groupKey = `${status ?? ''} ${shape}`;
      let group = groups.get(groupKey);
      if (!group) {
        group = [];
        groups.set(groupKey, group);
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
    }
  }

  const samplesByOperation = new Map<string, TrafficSample[]>();
  for (const [operationKey, groups] of operations) {
    const samples: TrafficSample[] = [];
    for (let round = 0; round < perGroup && samples.length < perOperation; round++) {
      for (const group of groups.values()) {
        if (samples.length >= perOperation) {
          break;
        }
        if (group[round]) {
          samples.push(group[round]);
        }
      }
    }
    samplesByOperation.set(operationKey, samples);
  }
  return samplesByOperation;
}
