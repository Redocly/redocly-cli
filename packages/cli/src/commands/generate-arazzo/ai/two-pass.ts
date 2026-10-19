import {
  type Config,
  isPlainObject,
  logger,
  parseYaml,
  stringifyYaml,
} from '@redocly/openapi-core';
import type { TestDescription } from '@redocly/respect-core';

import { lintDocumentSource, stripCodeFences } from '../../../utils/ai/output.js';
import { runProvider } from '../../../utils/ai/providers.js';
import { runWorkerPool } from '../../../utils/ai/worker-pool.js';
import { OPENAPI3_METHOD_NAMES } from '../../split/oas/constants.js';
import type { GenerateWorkflowsOptions } from './generate-workflows.js';
import {
  buildScenarioDesignPrompt,
  buildScenarioSelectionPrompt,
  MAX_PROMPT_CHARS,
  type OperationEntry,
  stripProse,
} from './prompt.js';
import {
  callProvider,
  collectReferences,
  parseWorkflowsDocument,
  validateReferences,
} from './provider-answer.js';

// Default number of scenario designs run against the provider at once.
const DESIGN_CONCURRENCY = 4;

const TOO_LARGE_MESSAGE = 'the OpenAPI description is too large to send to the AI provider';

const HTTP_METHODS = new Set<string>(OPENAPI3_METHOD_NAMES);

/**
 * Join the description's operations with the references the baseline uses for
 * them: operationId references end with the operationId, operationPath
 * references end with the JSON-pointer-ish path and method the generator
 * built them from.
 */
function collectOperationEntries(
  description: unknown,
  baseline: TestDescription
): OperationEntry[] {
  const baselineRefs = collectReferences(baseline.workflows).operationRefs;
  const byOperationId = new Map<string, string>();
  const operationPathRefs: string[] = [];
  for (const reference of baselineRefs) {
    if (reference.startsWith('$sourceDescriptions.')) {
      // The source description name never contains dots, so everything after
      // the second dot is the operationId.
      byOperationId.set(reference.split('.').slice(2).join('.'), reference);
    } else {
      operationPathRefs.push(reference);
    }
  }

  const entries: OperationEntry[] = [];
  if (!isPlainObject(description) || !isPlainObject(description.paths)) {
    return entries;
  }
  for (const [path, pathItem] of Object.entries(description.paths)) {
    if (!isPlainObject(pathItem)) {
      continue;
    }
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(method.toLowerCase()) || !isPlainObject(operation)) {
        continue;
      }
      const reference =
        typeof operation.operationId === 'string'
          ? byOperationId.get(operation.operationId)
          : operationPathRefs.find((operationPathRef) =>
              operationPathRef.endsWith(`#/paths/~1${path.replace(/^\//, '')}/${method}`)
            );
      if (!reference) {
        continue;
      }
      entries.push({
        reference,
        method,
        path,
        ...(typeof operation.summary === 'string' && { summary: operation.summary }),
        ...(Array.isArray(operation.tags) && {
          tags: operation.tags.filter((tag) => typeof tag === 'string'),
        }),
      });
    }
  }
  return entries;
}

interface Scenario {
  workflowId: string;
  summary?: string;
  operations: string[];
}

function parseScenariosDocument(
  text: string,
  maxWorkflows: number,
  validEntries: Map<string, OperationEntry>
): Scenario[] {
  let parsed: unknown;
  try {
    parsed = parseYaml(stripCodeFences(text));
  } catch (error) {
    throw new Error(
      `the provider did not return valid YAML: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
  if (!isPlainObject(parsed) || !Array.isArray(parsed.scenarios) || parsed.scenarios.length === 0) {
    throw new Error('the response is not a YAML document with a non-empty "scenarios" list');
  }
  if (parsed.scenarios.length > maxWorkflows) {
    throw new Error(
      `the response contains ${parsed.scenarios.length} scenarios, more than the --max-workflows limit of ${maxWorkflows}`
    );
  }

  const scenarios: Scenario[] = [];
  const workflowIds = new Set<string>();
  const unknownOperations = new Set<string>();
  for (const scenario of parsed.scenarios) {
    if (
      !isPlainObject(scenario) ||
      typeof scenario.workflowId !== 'string' ||
      !Array.isArray(scenario.operations) ||
      scenario.operations.length === 0
    ) {
      throw new Error('every scenario needs a "workflowId" and a non-empty "operations" list');
    }
    if (workflowIds.has(scenario.workflowId)) {
      throw new Error(`the response repeats the scenario workflowId "${scenario.workflowId}"`);
    }
    workflowIds.add(scenario.workflowId);

    const operations: string[] = [];
    for (const operation of scenario.operations) {
      if (typeof operation !== 'string' || !validEntries.has(operation)) {
        unknownOperations.add(String(operation));
      } else if (!operations.includes(operation)) {
        operations.push(operation);
      }
    }
    scenarios.push({
      workflowId: scenario.workflowId,
      ...(typeof scenario.summary === 'string' && { summary: scenario.summary }),
      operations,
    });
  }
  if (unknownOperations.size > 0) {
    throw new Error(
      `the response references operation(s) missing from the OpenAPI description: ${[
        ...unknownOperations,
      ].join(', ')}`
    );
  }
  return scenarios;
}

// How many levels of schema nesting a pruned scenario slice keeps. Chaining
// needs parameters and the top response/request fields, not the full shapes.
const SCHEMA_PRUNE_DEPTH = 3;

function pruneSchema(schema: unknown, depth: number): unknown {
  if (!isPlainObject(schema)) {
    return schema;
  }
  if (depth <= 0) {
    return typeof schema.type === 'string' ? { type: schema.type } : {};
  }
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(schema)) {
    if (key === 'properties' && isPlainObject(child)) {
      result[key] = Object.fromEntries(
        Object.entries(child).map(([name, property]) => [name, pruneSchema(property, depth - 1)])
      );
    } else if ((key === 'items' || key === 'additionalProperties') && isPlainObject(child)) {
      result[key] = pruneSchema(child, depth - 1);
    } else if (['allOf', 'anyOf', 'oneOf'].includes(key) && Array.isArray(child)) {
      result[key] = child.map((variant) => pruneSchema(variant, depth - 1));
    } else {
      result[key] = child;
    }
  }
  return result;
}

/** Cap the depth of every `schema` in an operation subtree. */
function pruneOperationSchemas(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => pruneOperationSchemas(item));
  }
  if (!isPlainObject(value)) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      key === 'schema' ? pruneSchema(child, SCHEMA_PRUNE_DEPTH) : pruneOperationSchemas(child),
    ])
  );
}

/**
 * The path item's fields shared by all its operations — `parameters`,
 * `servers`, extensions — everything except the sibling operations.
 */
function slicePathItemSharedFields(
  pathItem: Record<string, unknown>,
  pruneSchemas: boolean
): Record<string, unknown> {
  const shared: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(pathItem)) {
    if (!HTTP_METHODS.has(key.toLowerCase())) {
      shared[key] = pruneSchemas ? pruneOperationSchemas(value) : value;
    }
  }
  return shared;
}

/** The description sliced down to one scenario's operations. */
function sliceDescription(
  description: unknown,
  entries: OperationEntry[],
  pruneSchemas: boolean
): unknown {
  const descriptionPaths = isPlainObject(description) ? description.paths : undefined;
  const paths: Record<string, Record<string, unknown>> = {};
  for (const entry of entries) {
    const pathItem = isPlainObject(descriptionPaths) ? descriptionPaths[entry.path] : undefined;
    const operation = isPlainObject(pathItem) ? pathItem[entry.method] : undefined;
    if (isPlainObject(pathItem) && operation !== undefined) {
      const slicedPathItem = (paths[entry.path] ??= slicePathItemSharedFields(
        pathItem,
        pruneSchemas
      ));
      slicedPathItem[entry.method] = pruneSchemas ? pruneOperationSchemas(operation) : operation;
    }
  }
  const components = isPlainObject(description) ? description.components : undefined;
  const securitySchemes = isPlainObject(components) ? components.securitySchemes : undefined;
  return stripProse({
    paths,
    ...(securitySchemes !== undefined && { components: { securitySchemes } }),
  });
}

interface DesignScenarioOptions {
  options: GenerateWorkflowsOptions;
  scenario: Scenario;
  entriesByRef: Map<string, OperationEntry>;
  baselineWorkflowsByRef: Map<string, unknown>;
  config: Config;
}

async function designScenario({
  options,
  scenario,
  entriesByRef,
  baselineWorkflowsByRef,
  config,
}: DesignScenarioOptions): Promise<unknown> {
  const entries = scenario.operations
    .map((reference) => entriesByRef.get(reference))
    .filter((entry): entry is OperationEntry => entry !== undefined);
  const buildPrompt = (pruneSchemas: boolean) =>
    buildScenarioDesignPrompt({
      workflowId: scenario.workflowId,
      summary: scenario.summary,
      description: sliceDescription(options.description, entries, pruneSchemas),
      baselineWorkflows: scenario.operations
        .map((reference) => baselineWorkflowsByRef.get(reference))
        .filter((workflow) => workflow !== undefined),
      components: options.baseline.components,
    });

  let prompt = buildPrompt(false);
  if (prompt.system.length + prompt.user.length > MAX_PROMPT_CHARS) {
    // Dereferenced operations can inline enormous schemas; capping the schema
    // depth keeps what chaining needs while fitting the prompt.
    prompt = buildPrompt(true);
  }
  if (prompt.system.length + prompt.user.length > MAX_PROMPT_CHARS) {
    throw new Error('the scenario is too large to send to the AI provider');
  }

  // No spinner here: concurrent designs share one spinner in the worker pool.
  const { text } = await runProvider(options.provider, { ...prompt, model: options.model });
  const parsed = parseWorkflowsDocument(text);
  if (parsed.workflows.length !== 1 || !isPlainObject(parsed.workflows[0])) {
    throw new Error('the response must contain exactly one workflow');
  }

  // The scenario id from the selection pass is the workflow's identity;
  // forcing it keeps the ids unique across concurrently designed workflows.
  const workflow = { ...parsed.workflows[0], workflowId: scenario.workflowId };
  validateReferences([workflow], options.baseline);
  await lintDocumentSource(
    stringifyYaml({
      arazzo: options.baseline.arazzo,
      info: options.baseline.info,
      sourceDescriptions: options.baseline.sourceDescriptions,
      workflows: [workflow],
      ...(options.baseline.components !== undefined && { components: options.baseline.components }),
    }),
    config
  );
  return workflow;
}

/**
 * Large-description mode: the whole description cannot go into one prompt, so
 * the AI first selects up to maxWorkflows scenarios from a compact operation
 * index, then designs each scenario's workflow from only its operations.
 * A scenario whose design is rejected is skipped; the accepted ones still land.
 */
export async function generateWorkflowsTwoPass(
  options: GenerateWorkflowsOptions,
  config: Config
): Promise<unknown[]> {
  const entries = collectOperationEntries(options.description, options.baseline);
  const selectionPrompt = buildScenarioSelectionPrompt({
    entries,
    maxWorkflows: options.maxWorkflows,
  });
  if (
    entries.length === 0 ||
    selectionPrompt.system.length + selectionPrompt.user.length > MAX_PROMPT_CHARS
  ) {
    throw new Error(TOO_LARGE_MESSAGE);
  }

  logger.info(
    'The OpenAPI description is too large for a single prompt; selecting operations first, then designing each workflow separately.\n'
  );

  const entriesByRef = new Map(entries.map((entry) => [entry.reference, entry]));
  const selectionText = await callProvider(
    options.provider,
    options.model,
    selectionPrompt,
    'Selecting workflow scenarios'
  );
  const scenarios = parseScenariosDocument(selectionText, options.maxWorkflows, entriesByRef);
  logger.info(
    `Selected ${scenarios.length} scenario(s): ${scenarios
      .map((scenario) => scenario.workflowId)
      .join(', ')}.\n`
  );

  const baselineWorkflowsByRef = new Map<string, unknown>();
  for (const workflow of options.baseline.workflows ?? []) {
    const reference = workflow.steps?.[0]?.operationId ?? workflow.steps?.[0]?.operationPath;
    if (typeof reference === 'string') {
      baselineWorkflowsByRef.set(reference, workflow);
    }
  }

  const designed = await runWorkerPool({
    items: scenarios,
    concurrency: options.concurrency ?? DESIGN_CONCURRENCY,
    action: 'Designing',
    successNote: 'designed',
    failureNote: 'skipped',
    label: (scenario) => scenario.workflowId,
    run: (scenario) =>
      designScenario({ options, scenario, entriesByRef, baselineWorkflowsByRef, config }),
  });

  const workflows = designed.filter((workflow) => workflow !== null);
  if (workflows.length === 0) {
    throw new Error(
      `the ${options.provider} provider did not produce a usable workflow for any scenario`
    );
  }
  return workflows;
}
