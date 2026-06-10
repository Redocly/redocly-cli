import type { OpenApiServer } from '../types/index.js';
import { parseUrl, getPathWithoutTrailingSlash, isSyntheticHost } from './http.js';

export interface ServerVariable {
  default?: unknown;
  enum?: unknown[];
}

export function resolveServerUrl(
  rawUrl: string,
  variables?: Record<string, ServerVariable>
): OpenApiServer {
  const resolvedUrl = rawUrl.replace(/\{([^}]+)\}/g, (_, variableName: string) => {
    const variable = variables?.[variableName];
    if (variable?.default !== undefined) {
      return String(variable.default);
    }
    if (Array.isArray(variable?.enum) && variable.enum.length > 0) {
      return String(variable.enum[0]);
    }
    return '';
  });

  const parsedUrl = parseUrl(resolvedUrl);
  const hasExplicitHost = Boolean(parsedUrl.host && !isSyntheticHost(parsedUrl.host));

  return {
    rawUrl,
    protocol: hasExplicitHost ? parsedUrl.protocol : undefined,
    host: hasExplicitHost ? parsedUrl.host.toLowerCase() : undefined,
    basePath: getPathWithoutTrailingSlash(parsedUrl.pathname || '/'),
  };
}

export function ensureLeadingSlash(value: string): string {
  if (!value) {
    return '/';
  }
  return value.startsWith('/') ? value : `/${value}`;
}
