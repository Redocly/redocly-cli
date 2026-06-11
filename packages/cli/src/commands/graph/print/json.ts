import type { DependencyGraph } from '../types.js';

/** Serializes the dependency graph as pretty-printed JSON. */
export function renderJson(graph: DependencyGraph): string {
  return JSON.stringify(graph, null, 2);
}
