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
  if (!operationServer.host) {
    return true;
  }

  if (!requestHost) {
    return false;
  }

  return operationServer.host === requestHost.toLowerCase();
}

function scoreCandidate(
  operation: OpenApiOperation,
  server: OpenApiServer,
  mode: MatchMode
): number {
  const hostScore = mode === 'strict-host' ? (server.host ? 20 : 5) : 0;
  return operation.pathScore * 10 + hostScore;
}

export function matchOperation(
  index: OpenApiIndex,
  exchange: NormalizedExchange,
  mode: MatchMode
): MatchedOperation | null {
  const method = exchange.request.method.toLowerCase();
  const operationCandidates = index.operationsByMethod.get(method);
  if (!operationCandidates || operationCandidates.length === 0) {
    return null;
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

      const params: Record<string, string> = {};
      for (let index = 0; index < operation.pathParams.length; index += 1) {
        const paramName = operation.pathParams[index];
        const paramValue = pathMatch[index + 1];
        if (paramName && paramValue !== undefined) {
          params[paramName] = decodeURIComponent(paramValue);
        }
      }

      const candidate: CandidateMatch = {
        score: scoreCandidate(operation, server, mode),
        matched: {
          operation,
          pathParams: params,
        },
      };

      if (!bestCandidate || candidate.score > bestCandidate.score) {
        bestCandidate = candidate;
      }
    }
  }

  return bestCandidate?.matched ?? null;
}
