import type { ApiIndexMeta, CollectedComponent, CollectedOperation } from './build-graph.js';
import { COMPONENT_SECTIONS } from './build-index.js';
import { OPERATION_METHODS } from './node-id.js';

export const HTTP_METHODS: ReadonlySet<string> = new Set(OPERATION_METHODS);

const SECTION_ALIASES = new Map<string, string>([
  ...COMPONENT_SECTIONS.map((section): [string, string] => [section.toLowerCase(), section]),
  ['schema', 'schemas'],
  ['response', 'responses'],
  ['parameter', 'parameters'],
  ['requestbody', 'requestBodies'],
  ['header', 'headers'],
  ['securityscheme', 'securitySchemes'],
  ['example', 'examples'],
  ['link', 'links'],
  ['callback', 'callbacks'],
]);

export function normalizeComponentSection(input: string): string | undefined {
  return SECTION_ALIASES.get(input.toLowerCase());
}

export function findOperationByPathMethod(
  meta: ApiIndexMeta,
  path: string,
  method: string
): CollectedOperation | undefined {
  const wanted = method.toUpperCase();
  return meta.operations.find(
    (operation) =>
      !operation.isWebhook && operation.containerKey === path && operation.method === wanted
  );
}

export function findOperationByOperationId(
  meta: ApiIndexMeta,
  operationId: string
): CollectedOperation | undefined {
  return meta.operations.find((operation) => operation.operationId === operationId);
}

export function findWebhookOperation(
  meta: ApiIndexMeta,
  webhook: string,
  method?: string
): CollectedOperation | undefined {
  const wanted = method?.toUpperCase();
  const candidates = meta.operations.filter(
    (operation) => operation.isWebhook && operation.containerKey === webhook
  );
  if (wanted === undefined) return candidates[0];
  return candidates.find((operation) => operation.method === wanted);
}

export function findComponent(
  meta: ApiIndexMeta,
  section: string,
  name: string
): CollectedComponent | undefined {
  return meta.components.find(
    (component) => component.section === section && component.name === name
  );
}

export function listOperations(
  meta: ApiIndexMeta,
  scope: { tag?: string; path?: string; webhook?: string } = {}
): CollectedOperation[] {
  return meta.operations.filter((operation) => {
    if (scope.webhook !== undefined) {
      return operation.isWebhook && operation.containerKey === scope.webhook;
    }
    if (operation.isWebhook) return false;
    if (scope.tag !== undefined) return operation.tags.includes(scope.tag);
    if (scope.path !== undefined) return operation.containerKey === scope.path;
    return true;
  });
}

export function suggestNames(input: string, candidates: string[], limit = 5): string[] {
  const needle = input.toLowerCase();
  const ranked = candidates
    .map((candidate) => {
      const haystack = candidate.toLowerCase();
      if (haystack === needle) return { candidate, rank: 0 };
      if (haystack.startsWith(needle)) return { candidate, rank: 1 };
      if (haystack.includes(needle)) return { candidate, rank: 2 };
      return undefined;
    })
    .filter((entry): entry is { candidate: string; rank: number } => entry !== undefined)
    .sort((left, right) => left.rank - right.rank || left.candidate.localeCompare(right.candidate));
  return [...new Set(ranked.map((entry) => entry.candidate))].slice(0, limit);
}
