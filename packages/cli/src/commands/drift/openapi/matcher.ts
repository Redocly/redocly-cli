import type {
  MatchMode,
  MatchedOperation,
  NormalizedExchange,
  OpenApiOperation,
  OpenApiServer,
  OpenApiIndex,
} from '../types/index.js';
import { getPathWithoutTrailingSlash } from '../utils/http.js';

interface CandidateMatch {
  score: number;
  matched: MatchedOperation;
}

function toRelativePath(requestPath: string, server: OpenApiServer): string | null {
  const normalizedRequestPath = getPathWithoutTrailingSlash(requestPath || '/') || '/';
  const normalizedBasePath = getPathWithoutTrailingSlash(server.basePath || '/') || '/';

  if (normalizedBasePath === '/') {
    return normalizedRequestPath;
  }

  if (normalizedRequestPath === normalizedBasePath) {
    return '/';
  }

  if (!normalizedRequestPath.startsWith(`${normalizedBasePath}/`)) {
    return null;
  }

  return normalizedRequestPath.slice(normalizedBasePath.length) || '/';
}

function hostMatches(operationServer: OpenApiServer, requestHost: string | undefined): boolean {
  if (!operationServer.host || !requestHost) {
    return true;
  }

  return operationServer.host === requestHost.toLowerCase();
}

function decodePathParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function scoreCandidate(
  operation: OpenApiOperation,
  server: OpenApiServer,
  mode: MatchMode
): number {
  const hostScore = mode === 'strict-host' ? (server.host ? 20 : 5) : 0;
  return operation.pathScore * 10 + hostScore;
}

function extractPathParams(
  operation: OpenApiOperation,
  pathMatch: RegExpExecArray
): Record<string, string> {
  const params: Record<string, string> = {};
  for (let index = 0; index < operation.pathParams.length; index += 1) {
    const paramName = operation.pathParams[index];
    const paramValue = pathMatch[index + 1];
    if (paramName && paramValue !== undefined) {
      params[paramName] = decodePathParam(paramValue);
    }
  }
  return params;
}

/**
 * Match an exchange whose path was already resolved relative to an explicit
 * API prefix: path templates are applied directly, ignoring spec servers.
 */
function matchOperationByRelativePath(
  operationCandidates: OpenApiOperation[],
  relativePath: string
): MatchedOperation | null {
  const normalizedPath = getPathWithoutTrailingSlash(relativePath) || '/';

  for (const operation of operationCandidates) {
    const pathMatch = operation.pathRegex.exec(normalizedPath);
    if (pathMatch) {
      return { operation, pathParams: extractPathParams(operation, pathMatch) };
    }
  }

  return null;
}

export function matchOperation(
  index: OpenApiIndex,
  exchange: NormalizedExchange,
  mode: MatchMode,
  relativePathOverride?: string
): MatchedOperation | null {
  const method = exchange.request.method.toLowerCase();
  const operationCandidates = index.operationsByMethod.get(method);
  if (!operationCandidates || operationCandidates.length === 0) {
    return null;
  }

  if (relativePathOverride !== undefined) {
    return matchOperationByRelativePath(operationCandidates, relativePathOverride);
  }

  let bestCandidate: CandidateMatch | null = null;

  for (const operation of operationCandidates) {
    for (const server of operation.servers) {
      if (mode === 'strict-host' && !hostMatches(server, exchange.request.host)) {
        continue;
      }

      const relativePath = toRelativePath(exchange.request.path, server);
      if (!relativePath) {
        continue;
      }

      const pathMatch = operation.pathRegex.exec(relativePath);
      if (!pathMatch) {
        continue;
      }

      const candidate: CandidateMatch = {
        score: scoreCandidate(operation, server, mode),
        matched: {
          operation,
          pathParams: extractPathParams(operation, pathMatch),
        },
      };

      if (!bestCandidate || candidate.score > bestCandidate.score) {
        bestCandidate = candidate;
      }
    }
  }

  return bestCandidate?.matched ?? null;
}
