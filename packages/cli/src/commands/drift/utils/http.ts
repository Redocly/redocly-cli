import { isPlainObject } from '@redocly/openapi-core';

const DUMMY_BASE_URL = 'http://drift.local';

const IGNORED_UNDOCUMENTED_HEADERS = new Set([
  'accept',
  'accept-charset',
  'accept-encoding',
  'accept-language',
  'authorization',
  'baggage',
  'cache-control',
  'cdn-loop',
  'cookie',
  'connection',
  'content-length',
  'dpr',
  'dnt',
  'downlink',
  'ect',
  'forwarded',
  'host',
  'if-match',
  'if-modified-since',
  'if-none-match',
  'if-range',
  'if-unmodified-since',
  'origin',
  'pragma',
  'priority',
  'range',
  'referer',
  'sec-fetch-dest',
  'sec-fetch-mode',
  'sec-fetch-site',
  'sec-fetch-user',
  'sec-gpc',
  'sentry-trace',
  'te',
  'traceparent',
  'tracestate',
  'upgrade',
  'upgrade-insecure-requests',
  'user-agent',
  'via',
  'x-amzn-trace-id',
  'x-client-trace-id',
  'x-cloud-trace-context',
  'x-correlation-id',
  'x-http-method-override',
  'x-method-override',
  'x-real-ip',
  'x-request-id',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-port',
  'x-forwarded-proto',
]);

const IGNORED_UNDOCUMENTED_HEADER_PREFIXES = [
  'cf-',
  'sec-ch-',
  'sec-fetch-',
  'x-b3-',
  'x-envoy-',
  'x-forwarded-',
];

export function normalizeHeaders(input: unknown): Record<string, string> {
  if (!isPlainObject(input) && !Array.isArray(input)) {
    return {};
  }

  if (Array.isArray(input)) {
    const result: Record<string, string> = {};
    for (const item of input) {
      if (!isPlainObject(item)) {
        continue;
      }
      const { name, value } = item as { name?: unknown; value?: unknown };
      if (typeof name === 'string' && value !== undefined) {
        result[name.toLowerCase()] = String(value);
      }
    }
    return result;
  }

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      result[key.toLowerCase()] = value.map((item) => String(item)).join(',');
      continue;
    }

    result[key.toLowerCase()] = String(value);
  }

  return result;
}

export function parseUrl(input: string): URL {
  try {
    return new URL(input);
  } catch {
    return new URL(input, DUMMY_BASE_URL);
  }
}

export function getPathWithoutTrailingSlash(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function compileOpenApiPath(pathTemplate: string): {
  regex: RegExp;
  params: string[];
  score: number;
} {
  const params: string[] = [];
  let score = 0;

  const normalizedPath = pathTemplate.startsWith('/') ? pathTemplate : `/${pathTemplate}`;
  const regexBody = normalizedPath
    .split('/')
    .map((segment) => {
      if (!segment) {
        return '';
      }

      const paramMatch = segment.match(/^\{([^}]+)\}$/);
      if (paramMatch) {
        params.push(paramMatch[1]);
        return '([^/]+)';
      }

      score += 2;
      return escapeRegex(segment);
    })
    .join('/');

  return {
    regex: new RegExp(`^${regexBody || '/'}$`),
    params,
    score,
  };
}

export function parseJsonBodyIfPresent(
  contentType: string | undefined,
  bodyText: string | undefined
): unknown {
  if (!bodyText) {
    return undefined;
  }

  if (!isJsonMime(contentType)) {
    return undefined;
  }

  try {
    return JSON.parse(bodyText);
  } catch {
    return undefined;
  }
}

export function normalizeContentType(contentType: string | undefined): string {
  if (!contentType) {
    return '';
  }

  return contentType.split(';')[0]?.trim().toLowerCase() ?? '';
}

export function isJsonMime(contentType: string | undefined): boolean {
  const mime = normalizeContentType(contentType);
  return mime === 'application/json' || mime.endsWith('+json');
}

export function pickSchemaByMime(
  contentMap: Record<string, unknown>,
  contentType: string | undefined
): unknown | undefined {
  const requestedMime = normalizeContentType(contentType);

  if (!requestedMime) {
    return contentMap['application/json'] ?? contentMap['*/*'];
  }

  if (contentMap[requestedMime] !== undefined) {
    return contentMap[requestedMime];
  }

  const [type, subtype] = requestedMime.split('/');
  if (type && subtype) {
    const wildcardSubtype = `${type}/*`;
    if (contentMap[wildcardSubtype] !== undefined) {
      return contentMap[wildcardSubtype];
    }
  }

  return contentMap['*/*'];
}

export function shouldIgnoreHeaderAsUndocumented(headerName: string): boolean {
  const normalizedHeaderName = headerName.toLowerCase();
  if (normalizedHeaderName.startsWith(':')) {
    return true;
  }

  return (
    IGNORED_UNDOCUMENTED_HEADERS.has(normalizedHeaderName) ||
    IGNORED_UNDOCUMENTED_HEADER_PREFIXES.some((prefix) => normalizedHeaderName.startsWith(prefix))
  );
}
