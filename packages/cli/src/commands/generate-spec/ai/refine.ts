import { isPlainObject, parseYaml, stringifyYaml } from '@redocly/openapi-core';

import type { GeneratedDocument } from '../generator.js';
import type { TrafficSample } from '../samples.js';
import { buildRefinementPrompt } from './prompt.js';
import { type AiProvider, runProvider } from './providers.js';

export interface RefineOptions {
  provider: AiProvider;
  model?: string;
  baseline: GeneratedDocument;
  samples: TrafficSample[];
}

export interface RefineResult {
  /** The refined description, normalized back to canonical YAML. */
  yaml: string;
  document: Record<string, unknown>;
}

/** Strip Markdown code fences the model may have added despite instructions. */
function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:ya?ml|json)?\s*\n([\s\S]*?)\n```$/);
  return fenceMatch ? fenceMatch[1] : trimmed;
}

function isOpenApiDocument(value: unknown): value is Record<string, unknown> {
  return isPlainObject(value) && 'openapi' in value && 'paths' in value;
}

export async function refineSpecWithAi(options: RefineOptions): Promise<RefineResult> {
  const { system, user } = buildRefinementPrompt({
    baseline: options.baseline,
    samples: options.samples,
  });

  const { text } = await runProvider(options.provider, { system, user, model: options.model });

  const cleaned = stripCodeFences(text);
  let parsed: unknown;
  try {
    parsed = parseYaml(cleaned);
  } catch (error) {
    throw new Error(
      `The ${options.provider} provider did not return valid YAML: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (!isOpenApiDocument(parsed)) {
    throw new Error(
      `The ${options.provider} provider returned content that is not a valid OpenAPI document.`
    );
  }

  return { yaml: stringifyYaml(parsed), document: parsed };
}
