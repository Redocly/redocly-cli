import type { NormalizedRequest } from '../types/index.js';
import { getPathWithoutTrailingSlash, isSyntheticHost, parseUrl } from './http.js';

export function normalizeServerPrefix(server: string | undefined): string | undefined {
  const trimmed = server?.replace(/\/+$/, '');
  return trimmed || undefined;
}

function stripPrefixFromPath(pathname: string, prefixPath: string): string | undefined {
  if (!prefixPath || prefixPath === '/') {
    return pathname || '/';
  }

  if (pathname === prefixPath) {
    return '/';
  }

  if (!pathname.startsWith(`${prefixPath}/`)) {
    return undefined;
  }

  return pathname.slice(prefixPath.length) || '/';
}

/**
 * Match a request against the server URL. Returns the path relative to the
 * server, or undefined when the request belongs to another host or path
 * subtree. A server starting with "/" matches by path only; otherwise it is
 * parsed as a URL and the host must match too, except for requests that did
 * not record a host (path-only captures), which are matched by path only.
 */
export function resolvePathForServer(
  request: NormalizedRequest,
  server: string
): string | undefined {
  if (server.startsWith('/')) {
    return stripPrefixFromPath(request.path, server);
  }

  const serverUrl = parseUrl(server.includes('://') ? server : `http://${server}`);
  if (
    isSyntheticHost(serverUrl.host) ||
    (request.host !== undefined && request.host.toLowerCase() !== serverUrl.host)
  ) {
    return undefined;
  }

  return stripPrefixFromPath(request.path, getPathWithoutTrailingSlash(serverUrl.pathname));
}
