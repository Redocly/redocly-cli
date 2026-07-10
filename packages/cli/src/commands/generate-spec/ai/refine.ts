import {
  type Config,
  createConfig,
  isPlainObject,
  lintFromString,
  logger,
  parseYaml,
  stringifyYaml,
} from '@redocly/openapi-core';
import * as process from 'node:process';

import { Spinner } from '../../../utils/spinner.js';
import type { GeneratedDocument, GeneratedOperation } from '../generator.js';
import { operationSampleKey, type TrafficSample } from '../samples.js';
import { buildOperationPrompt } from './prompt.js';
import { type AiProvider, CliNotFoundError, runProvider } from './providers.js';

export interface RefineOptions {
  provider: AiProvider;
  model?: string;
  baseline: GeneratedDocument;
  samplesByOperation: Map<string, TrafficSample[]>;
}

/** The baseline document with AI-refined operations and components merged in. */
export type RefinedDocument = {
  openapi: string;
  info: { title: string; version: string };
  servers?: { url: string }[];
  paths: Record<string, Record<string, unknown>>;
  components?: { schemas: Record<string, unknown> };
};

export interface RefineResult {
  /** The refined description, normalized back to canonical YAML. */
  yaml: string;
  document: RefinedDocument;
  /** Operations whose refinement was accepted; the rest kept their baseline. */
  refined: number;
  total: number;
}

interface OperationFragment {
  operation: Record<string, unknown>;
  components: Record<string, unknown>;
}

/** Strip Markdown code fences the model may have added despite instructions. */
function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:ya?ml|json)?\s*\n([\s\S]*?)\n```$/);
  return fenceMatch ? fenceMatch[1] : trimmed;
}

const COMPONENT_REF_RE = /^#\/components\/schemas\/(.+)$/;

function collectComponentRefs(value: unknown, into: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectComponentRefs(item, into);
    }
    return;
  }
  if (!isPlainObject(value)) {
    return;
  }
  if (typeof value.$ref === 'string') {
    const refMatch = value.$ref.match(COMPONENT_REF_RE);
    if (refMatch) {
      into.add(refMatch[1]);
    }
  }
  for (const child of Object.values(value)) {
    collectComponentRefs(child, into);
  }
}

function transitivelyReferencedComponents(
  root: unknown,
  schemas: Record<string, unknown>
): Set<string> {
  const referenced = new Set<string>();
  const pending: unknown[] = [root];
  while (pending.length > 0) {
    const names = new Set<string>();
    collectComponentRefs(pending.pop(), names);
    for (const name of names) {
      if (!referenced.has(name) && name in schemas) {
        referenced.add(name);
        pending.push(schemas[name]);
      }
    }
  }
  return referenced;
}

/** Drop components no operation references anymore after refinement. */
function pruneUnusedComponents(document: RefinedDocument): void {
  const schemas = document.components?.schemas;
  if (!schemas) {
    return;
  }
  const used = transitivelyReferencedComponents(document.paths, schemas);
  for (const name of Object.keys(schemas)) {
    if (!used.has(name)) {
      delete schemas[name];
    }
  }
  if (Object.keys(schemas).length === 0) {
    delete document.components;
  }
}

function parseOperationFragment(text: string, path: string, method: string): OperationFragment {
  const cleaned = stripCodeFences(text);
  let parsed: unknown;
  try {
    parsed = parseYaml(cleaned);
  } catch (error) {
    throw new Error(
      `the provider did not return valid YAML: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (!isPlainObject(parsed)) {
    throw new Error('the response is not a YAML document with a "paths" object');
  }
  const paths = parsed.paths;
  if (!isPlainObject(paths)) {
    throw new Error('the response is not a YAML document with a "paths" object');
  }
  const pathItem = paths[path];
  if (!isPlainObject(pathItem)) {
    throw new Error(`the response does not keep the path template "${path}"`);
  }
  const operation = pathItem[method];
  if (!isPlainObject(operation)) {
    throw new Error(`the response does not contain the ${method.toUpperCase()} operation`);
  }

  const components = parsed.components;
  const schemas = isPlainObject(components) ? components.schemas : undefined;
  return { operation, components: isPlainObject(schemas) ? schemas : {} };
}

function missingStatuses(
  baselineOperation: GeneratedOperation,
  refinedOperation: Record<string, unknown>
): string[] {
  const responses = isPlainObject(refinedOperation.responses) ? refinedOperation.responses : {};
  return Object.keys(baselineOperation.responses).filter((status) => !(status in responses));
}

async function lintDocumentSource(source: string, config: Config): Promise<void> {
  const problems = await lintFromString({ source, config });
  const errors = problems.filter((problem) => problem.severity === 'error');
  if (errors.length > 0) {
    const summary = errors
      .slice(0, 5)
      .map((problem) => `${problem.ruleId}: ${problem.message}`)
      .join('; ');
    throw new Error(`the result has ${errors.length} validation problem(s): ${summary}`);
  }
}

interface RefineOperationOptions {
  provider: AiProvider;
  model?: string;
  document: RefinedDocument;
  path: string;
  method: string;
  operation: GeneratedOperation;
  samples: TrafficSample[];
  config: Config;
}

async function refineOperation(options: RefineOperationOptions): Promise<OperationFragment> {
  const schemas = options.document.components?.schemas ?? {};
  const referenced = transitivelyReferencedComponents(options.operation, schemas);
  const components: Record<string, unknown> = {};
  for (const name of referenced) {
    components[name] = schemas[name];
  }

  const { system, user } = buildOperationPrompt({
    path: options.path,
    method: options.method,
    operation: options.operation,
    components,
    reservedComponentNames: Object.keys(schemas).filter((name) => !referenced.has(name)),
    samples: options.samples,
  });

  const { text } = await runProvider(options.provider, { system, user, model: options.model });
  const fragment = parseOperationFragment(text, options.path, options.method);

  const dropped = missingStatuses(options.operation, fragment.operation);
  if (dropped.length > 0) {
    throw new Error(`the response dropped observed response status(es): ${dropped.join(', ')}`);
  }

  // Lint the refined operation against the description's full component set,
  // so $refs to unchanged shared components still resolve.
  const fragmentDocument = {
    openapi: options.document.openapi,
    info: options.document.info,
    paths: { [options.path]: { [options.method]: fragment.operation } },
    components: { schemas: { ...schemas, ...fragment.components } },
  };
  await lintDocumentSource(stringifyYaml(fragmentDocument), options.config);

  return fragment;
}

function applyFragment(
  document: RefinedDocument,
  path: string,
  method: string,
  fragment: OperationFragment
): void {
  document.paths[path][method] = fragment.operation;
  if (Object.keys(fragment.components).length > 0) {
    document.components ??= { schemas: {} };
    Object.assign(document.components.schemas, fragment.components);
  }
}

function finishProgress(spinner: Spinner): void {
  spinner.stop();
  if (process.stderr.isTTY) {
    // Erase the leftover spinner frame so the result line prints clean.
    logger.info('\x1b[2K');
  }
}

/**
 * Refine the baseline one operation at a time: each prompt carries only that
 * operation, the components it references, and its own traffic samples, so
 * prompt and response stay small no matter how large the description is.
 * Operations are processed sequentially and each accepted refinement is merged
 * back before the next prompt, so later operations see already-refined shared
 * components. An operation whose refinement is rejected keeps its baseline.
 */
export async function refineSpecWithAi(options: RefineOptions): Promise<RefineResult> {
  const document: RefinedDocument = structuredClone(options.baseline);
  const config = await createConfig({ extends: ['spec'] });

  const operations: { path: string; method: string; operation: GeneratedOperation }[] = [];
  for (const [path, pathItem] of Object.entries(options.baseline.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      operations.push({ path, method, operation });
    }
  }

  const spinner = new Spinner();
  let refined = 0;
  for (const [index, { path, method, operation }] of operations.entries()) {
    const progress = `[${index + 1}/${operations.length}]`;
    const label = `${method.toUpperCase()} ${path}`;
    const startedAt = Date.now();
    spinner.start(`${progress} Refining ${label}`);
    try {
      const fragment = await refineOperation({
        provider: options.provider,
        model: options.model,
        document,
        path,
        method,
        operation,
        samples: options.samplesByOperation.get(operationSampleKey(method, path)) ?? [],
        config,
      });
      applyFragment(document, path, method, fragment);
      refined += 1;
      finishProgress(spinner);
      logger.info(
        `${progress} ${label} — refined (${Math.round((Date.now() - startedAt) / 1000)}s)\n`
      );
    } catch (error) {
      finishProgress(spinner);
      if (error instanceof CliNotFoundError) {
        throw error;
      }
      logger.warn(
        `${progress} ${label} — kept the baseline: ${
          error instanceof Error ? error.message : String(error)
        }\n`
      );
    }
  }

  if (refined === 0) {
    throw new Error(
      `the ${options.provider} provider did not produce a usable refinement for any operation`
    );
  }

  pruneUnusedComponents(document);
  const yaml = stringifyYaml(document);
  await lintDocumentSource(yaml, config);

  return { yaml, document, refined, total: operations.length };
}
