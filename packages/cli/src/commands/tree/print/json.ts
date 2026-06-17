import type { DependencyGraph } from '../types.js';

export function renderJson(graph: DependencyGraph): string {
  return JSON.stringify(graph, null, 2);
}
