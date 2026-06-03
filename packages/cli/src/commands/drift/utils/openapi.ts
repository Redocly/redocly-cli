import { parseUrl, getPathWithoutTrailingSlash } from './http.js';
import type { OpenApiServer } from '../types/index.js';

export function resolveServerUrl(rawUrl: string, variables?: Record<string, any>): OpenApiServer {
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
  const hasExplicitHost = Boolean(parsedUrl.host && !parsedUrl.host.includes('drift.local'));

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
