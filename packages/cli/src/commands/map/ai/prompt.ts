import type { ApiMapNode } from '@redocly/openapi-core';

const SYSTEM_INSTRUCTIONS = `You are an expert API technical writer. You are given:
1. An API map: a JSON tree index of an API description. Each node has "title", "kind", a canonical JSON "pointer", an optional "summary", and child "nodes". Some summaries are missing or were derived mechanically from structure.
2. The API description the map was generated from.

Write concise, useful summaries (plain text, at most 200 characters each) for map nodes whose current summary is missing, mechanical, or unhelpful. Base every summary strictly on the API description; do not invent behavior.

Output ONLY a JSON object mapping node "pointer" values to their improved summary strings. Do not wrap it in Markdown code fences. Do not add any commentary before or after the JSON.`;

export interface BuildPromptOptions {
  apiMap: ApiMapNode;
  description: string;
}

export function buildSummariesPrompt(options: BuildPromptOptions): {
  system: string;
  user: string;
} {
  const user = [
    '## API map',
    JSON.stringify(options.apiMap, null, 2),
    '',
    '## API description',
    options.description,
  ].join('\n');

  return { system: SYSTEM_INSTRUCTIONS, user };
}
