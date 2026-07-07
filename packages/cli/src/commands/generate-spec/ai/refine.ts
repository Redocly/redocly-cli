import {
  createConfig,
  isPlainObject,
  lintFromString,
  logger,
  parseYaml,
  stringifyYaml,
} from '@redocly/openapi-core';

import { type GeneratedDocument, HTTP_METHODS } from '../generator.js';
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

export interface OperationRef {
  path: string;
  method: string;
}

export interface OperationComparison {
  /** Baseline operations absent from the refined document. */
  missing: OperationRef[];
  /** Refined operations that never appear in the baseline. */
  invented: OperationRef[];
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

/** Path parameter names may be legitimately renamed by the AI; compare templates by position. */
function normalizeTemplate(path: string): string {
  return path.replace(/\{[^}]*\}/g, '{}');
}

function methodsOfPathItem(pathItem: unknown): string[] {
  return isPlainObject(pathItem)
    ? Object.keys(pathItem).filter((key) => HTTP_METHODS.has(key))
    : [];
}

function formatOperations(operations: OperationRef[], limit: number): string {
  const formatted = operations
    .slice(0, limit)
    .map(({ method, path }) => `${method.toUpperCase()} ${path}`)
    .join(', ');
  return operations.length > limit ? `${formatted}, …` : formatted;
}

export function compareOperations(
  baseline: GeneratedDocument,
  refined: Record<string, unknown>
): OperationComparison {
  const refinedPaths = isPlainObject(refined.paths) ? refined.paths : {};
  const refinedMethods = new Map<string, Set<string>>();
  for (const [path, pathItem] of Object.entries(refinedPaths)) {
    const normalized = normalizeTemplate(path);
    const methods = refinedMethods.get(normalized) ?? new Set<string>();
    refinedMethods.set(normalized, methods);
    for (const method of methodsOfPathItem(pathItem)) {
      methods.add(method);
    }
  }

  const missing: OperationRef[] = [];
  const baselineMethods = new Map<string, Set<string>>();
  for (const [path, pathItem] of Object.entries(baseline.paths)) {
    const normalized = normalizeTemplate(path);
    const methods = baselineMethods.get(normalized) ?? new Set<string>();
    baselineMethods.set(normalized, methods);
    for (const method of Object.keys(pathItem)) {
      methods.add(method);
      if (!refinedMethods.get(normalized)?.has(method)) {
        missing.push({ path, method });
      }
    }
  }

  const invented: OperationRef[] = [];
  for (const [path, pathItem] of Object.entries(refinedPaths)) {
    const allowed = baselineMethods.get(normalizeTemplate(path));
    for (const method of methodsOfPathItem(pathItem)) {
      if (!allowed?.has(method)) {
        invented.push({ path, method });
      }
    }
  }

  return { missing, invented };
}

export function stripInventedOperations(
  refined: Record<string, unknown>,
  invented: OperationRef[]
): void {
  if (invented.length === 0 || !isPlainObject(refined.paths)) {
    return;
  }
  const paths = refined.paths;
  for (const { path, method } of invented) {
    const pathItem = paths[path];
    if (isPlainObject(pathItem)) {
      delete pathItem[method];
      if (methodsOfPathItem(pathItem).length === 0) {
        delete paths[path];
      }
    }
  }
}

async function lintRefinedDocument(yaml: string, provider: AiProvider): Promise<void> {
  const config = await createConfig({ extends: ['spec'] });
  const problems = await lintFromString({ source: yaml, config });
  const errors = problems.filter((problem) => problem.severity === 'error');
  if (errors.length > 0) {
    const summary = errors
      .slice(0, 5)
      .map((problem) => `${problem.ruleId}: ${problem.message}`)
      .join('; ');
    throw new Error(
      `The ${provider} provider returned an OpenAPI document with ${errors.length} validation problem(s): ${summary}`
    );
  }
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

  const { missing, invented } = compareOperations(options.baseline, parsed);
  if (missing.length > 0) {
    throw new Error(
      `The ${options.provider} provider dropped ${
        missing.length
      } operation(s) observed in the traffic (the response may have been truncated): ${formatOperations(
        missing,
        10
      )}`
    );
  }
  if (invented.length > 0) {
    logger.warn(
      `Removed ${invented.length} operation(s) the AI invented that never appear in the traffic: ${formatOperations(
        invented,
        10
      )}\n`
    );
    stripInventedOperations(parsed, invented);
  }

  const yaml = stringifyYaml(parsed);
  await lintRefinedDocument(yaml, options.provider);

  return { yaml, document: parsed };
}
