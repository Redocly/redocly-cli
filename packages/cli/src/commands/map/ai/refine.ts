import { isPlainObject, type ApiMapNode } from '@redocly/openapi-core';

import { buildSummariesPrompt } from './prompt.js';
import { type AiProvider, runProvider } from './providers.js';

export interface RefineOptions {
  provider: AiProvider;
  model?: string;
  apiMap: ApiMapNode;
  description: string;
}

/** Strip Markdown code fences the model may have added despite instructions. */
function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:ya?ml|json)?\s*\n([\s\S]*?)\n```$/);
  return fenceMatch ? fenceMatch[1] : trimmed;
}

export async function refineSummariesWithAi(options: RefineOptions): Promise<number> {
  const { system, user } = buildSummariesPrompt({
    apiMap: options.apiMap,
    description: options.description,
  });

  const { text } = await runProvider(options.provider, { system, user, model: options.model });

  const cleaned = stripCodeFences(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (error) {
    throw new Error(
      `The ${options.provider} provider did not return valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
  if (!isPlainObject(parsed)) {
    throw new Error(
      `The ${options.provider} provider returned content that is not a pointer-to-summary JSON object.`
    );
  }

  const summaries = new Map(
    Object.entries(parsed).filter(
      (entry): entry is [string, string] =>
        entry[0].startsWith('#/') && typeof entry[1] === 'string' && entry[1].length > 0
    )
  );
  return applySummaries(options.apiMap, summaries);
}

function applySummaries(node: ApiMapNode, summaries: Map<string, string>): number {
  let applied = 0;
  const summary = summaries.get(node.pointer);
  if (summary) {
    node.summary = summary;
    applied++;
  }
  for (const child of node.nodes) {
    applied += applySummaries(child, summaries);
  }
  return applied;
}
