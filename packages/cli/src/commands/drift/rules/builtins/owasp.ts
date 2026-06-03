import type { Finding, RuleContext, RulePlugin } from '../../types/index.js';

const MAX_EXPOSED_PATHS = 6;
const MAX_SCAN_NODES = 2000;
const MAX_SCAN_ARRAY_ITEMS = 50;
const MAX_SENSITIVE_QUERY_PARAMS = 5;
const LARGE_RESPONSE_THRESHOLD_BYTES = 1_000_000;

const SENSITIVE_QUERY_KEY_PATTERN = /(?:token|api[_-]?key|apikey|password|passwd|secret|authorization|jwt)/i;
const SENSITIVE_RESPONSE_KEY_PATTERN =
  /(?:password|passwd|secret|api[_-]?key|access[_-]?token|refresh[_-]?token|private[_-]?key|ssn|credit[_-]?card|card[_-]?number|cvv)/i;

const PAGINATION_QUERY_KEYS = new Set([
  'page',
  'limit',
  'offset',
  'cursor',
  'per_page',
  'perpage',
  'size',
  'start',
  'after',
  'before',
]);

interface OwaspMeta {
  issueId: string;
  issueTitle: string;
  summary: string;
}

function maskValue(value: string): string {
  if (value.length <= 6) {
    return '***';
  }

  return `${value.slice(0, 4)}…${value.slice(-2)}`;
}

function normalizeJsonPointerSegment(segment: string): string {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

function looksLikePrimitive(value: unknown): value is string | number {
  return typeof value === 'string' || typeof value === 'number';
}

function isFlagLikeSensitiveField(key: string): boolean {
  const lower = key.toLowerCase();
  if (!(lower.includes('secret') || lower.includes('token') || lower.includes('key'))) {
    return false;
  }

  return (
    lower.startsWith('is') ||
    lower.startsWith('has') ||
    lower.startsWith('can') ||
    lower.startsWith('should') ||
    lower.startsWith('enable') ||
    lower.startsWith('allow')
  );
}

function isBooleanLikeValue(value: string | number): boolean {
  if (typeof value === 'number') {
    return value === 0 || value === 1;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === 'false' || normalized === '0' || normalized === '1';
}

function findSensitiveResponsePaths(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const exposedPaths: string[] = [];
  const queue: Array<{ value: unknown; path: string }> = [{ value: payload, path: '' }];
  let visitedNodes = 0;

  while (queue.length > 0 && visitedNodes < MAX_SCAN_NODES && exposedPaths.length < MAX_EXPOSED_PATHS) {
    const current = queue.pop();
    if (!current) {
      break;
    }

    visitedNodes += 1;

    if (Array.isArray(current.value)) {
      const limit = Math.min(current.value.length, MAX_SCAN_ARRAY_ITEMS);
      for (let index = 0; index < limit; index += 1) {
        const item = current.value[index];
        if (item && typeof item === 'object') {
          queue.push({ value: item, path: `${current.path}/${index}` });
        }
      }
      continue;
    }

    if (!current.value || typeof current.value !== 'object') {
      continue;
    }

    for (const [key, value] of Object.entries(current.value as Record<string, unknown>)) {
      const pointerPath = `${current.path}/${normalizeJsonPointerSegment(key)}`;
      if (SENSITIVE_RESPONSE_KEY_PATTERN.test(key) && looksLikePrimitive(value)) {
        const stringified = String(value);
        if (isFlagLikeSensitiveField(key) && isBooleanLikeValue(value)) {
          continue;
        }

        if (stringified.length > 0) {
          exposedPaths.push(pointerPath || '/');
          if (exposedPaths.length >= MAX_EXPOSED_PATHS) {
            break;
          }
        }
      }

      if (value && typeof value === 'object') {
        queue.push({ value, path: pointerPath });
      }
    }
  }

  return exposedPaths;
}

function hasPaginationHint(query: URLSearchParams): boolean {
  for (const key of query.keys()) {
    if (PAGINATION_QUERY_KEYS.has(key.toLowerCase())) {
      return true;
    }
  }

  return false;
}

function buildSecurityFinding(
  context: RuleContext,
  message: string,
  target: 'request' | 'response',
  severity: 'error' | 'warning' | 'info',
  details: OwaspMeta & Record<string, unknown>,
): Finding {
  return {
    ruleId: 'owasp-api-top10',
    severity,
    category: 'security',
    message,
    exchangeIndex: context.exchange.index,
    operationId: context.matchedOperation?.operation.operationId,
    specSource: context.matchedOperation?.operation.specSource,
    target,
    details,
  };
}

function detectSensitiveQueryParams(context: RuleContext): Finding[] {
  const matches: Array<{ key: string; valuePreview: string }> = [];
  for (const [key, value] of context.exchange.request.query.entries()) {
    if (!SENSITIVE_QUERY_KEY_PATTERN.test(key)) {
      continue;
    }

    matches.push({
      key,
      valuePreview: maskValue(value),
    });

    if (matches.length >= MAX_SENSITIVE_QUERY_PARAMS) {
      break;
    }
  }

  if (matches.length === 0) {
    return [];
  }

  return [
    buildSecurityFinding(
      context,
      'Sensitive credential-like query parameters detected',
      'request',
      'warning',
      {
        issueId: 'API2:2023',
        issueTitle: 'Broken Authentication',
        summary:
          'Authentication data should not be passed via query parameters because it can leak via logs, browser history, and referrers.',
        sensitiveQueryParams: matches,
      },
    ),
  ];
}

function detectInsecureCors(context: RuleContext): Finding[] {
  const response = context.exchange.response;
  if (!response) {
    return [];
  }

  const allowOrigin = response.headers['access-control-allow-origin']?.trim();
  const allowCredentials = response.headers['access-control-allow-credentials']?.trim().toLowerCase();
  if (allowOrigin !== '*' || allowCredentials !== 'true') {
    return [];
  }

  return [
    buildSecurityFinding(
      context,
      'Insecure CORS policy: wildcard origin with credentials enabled',
      'response',
      'error',
      {
        issueId: 'API8:2023',
        issueTitle: 'Security Misconfiguration',
        summary:
          'Access-Control-Allow-Origin is "*" while Access-Control-Allow-Credentials is true. Browsers may expose authenticated API responses to untrusted origins.',
        headers: {
          accessControlAllowOrigin: allowOrigin,
          accessControlAllowCredentials: allowCredentials,
        },
      },
    ),
  ];
}

function detectWeakCookieAttributes(context: RuleContext): Finding[] {
  const response = context.exchange.response;
  if (!response) {
    return [];
  }

  const setCookie = response.headers['set-cookie'];
  if (!setCookie) {
    return [];
  }

  const findings: Finding[] = [];
  const cookieHeader = setCookie.toLowerCase();

  if (context.exchange.request.protocol === 'https:' && !/\bsecure\b/.test(cookieHeader)) {
    findings.push(
      buildSecurityFinding(context, 'Set-Cookie header is missing "Secure" attribute', 'response', 'warning', {
        issueId: 'API2:2023',
        issueTitle: 'Broken Authentication',
        summary: 'Session cookies over HTTPS should include "Secure" to prevent transmission over plain HTTP.',
        setCookiePreview: setCookie.slice(0, 200),
      }),
    );
  }

  if (!/\bhttponly\b/.test(cookieHeader)) {
    findings.push(
      buildSecurityFinding(context, 'Set-Cookie header is missing "HttpOnly" attribute', 'response', 'warning', {
        issueId: 'API2:2023',
        issueTitle: 'Broken Authentication',
        summary:
          'Session cookies should include "HttpOnly" to reduce risk of token theft via client-side script access.',
        setCookiePreview: setCookie.slice(0, 200),
      }),
    );
  }

  if (!/\bsamesite\s*=/.test(cookieHeader)) {
    findings.push(
      buildSecurityFinding(context, 'Set-Cookie header is missing "SameSite" attribute', 'response', 'info', {
        issueId: 'API8:2023',
        issueTitle: 'Security Misconfiguration',
        summary: 'Set "SameSite" on session cookies to reduce CSRF risk for state-changing requests.',
        setCookiePreview: setCookie.slice(0, 200),
      }),
    );
  }

  return findings;
}

function detectSensitiveResponseData(context: RuleContext): Finding[] {
  const response = context.exchange.response;
  if (!response || response.bodyJson === undefined) {
    return [];
  }

  const exposedPaths = findSensitiveResponsePaths(response.bodyJson);
  if (exposedPaths.length === 0) {
    return [];
  }

  return [
    buildSecurityFinding(context, 'Potential sensitive data exposure in response payload', 'response', 'warning', {
      issueId: 'API3:2019',
      issueTitle: 'Excessive Data Exposure',
      summary: `Sensitive-looking fields detected in response payload: ${exposedPaths.join(', ')}`,
      exposedPaths,
    }),
  ];
}

function detectLargeUnpaginatedResponses(context: RuleContext): Finding[] {
  const response = context.exchange.response;
  if (!response || response.status >= 400 || context.exchange.request.method !== 'GET') {
    return [];
  }

  if (!response.bodyText || response.bodyText.length < LARGE_RESPONSE_THRESHOLD_BYTES) {
    return [];
  }

  if (hasPaginationHint(context.exchange.request.query)) {
    return [];
  }

  return [
    buildSecurityFinding(
      context,
      'Large response without pagination parameters (possible resource-consumption risk)',
      'response',
      'info',
      {
        issueId: 'API4:2023',
        issueTitle: 'Unrestricted Resource Consumption',
        summary:
          'A large response was returned without common pagination query parameters. Consider explicit page/limit controls for large collections.',
        responseBytes: response.bodyText.length,
      },
    ),
  ];
}

export class OwaspApiTop10Rule implements RulePlugin {
  public readonly id = 'owasp-api-top10';

  public analyze(context: RuleContext): Finding[] {
    if (!context.matchedOperation) {
      return [];
    }

    return [
      ...detectSensitiveQueryParams(context),
      ...detectInsecureCors(context),
      ...detectWeakCookieAttributes(context),
      ...detectSensitiveResponseData(context),
      ...detectLargeUnpaginatedResponses(context),
    ];
  }
}
