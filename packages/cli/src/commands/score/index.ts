import {
  normalizeTypes,
  BaseResolver,
  resolveDocument,
  detectSpec,
  getTypes,
  normalizeVisitors,
  walkDocument,
  bundle,
  logger,
  type OutputFormat,
  type WalkContext,
} from '@redocly/openapi-core';
import * as colors from 'colorette';
import { performance } from 'perf_hooks';

import type { VerifyConfigOptions } from '../../types.js';
import { getFallbackApisOrExit, printExecutionTime } from '../../utils/miscellaneous.js';
import type { CommandArgs } from '../../wrapper.js';
import {
  createScoreAccumulator,
  createScoreVisitor,
  createSchemaWalkState,
  resetSchemaWalkState,
  createSchemaMetricVisitor,
  getDocumentMetrics,
} from './collectors/document-metrics.js';
import { computeWorkflowDepths } from './collectors/workflow-graph.js';
import { printScoreJson } from './formatters/json.js';
import { printDebugOperation, printScoreStylish } from './formatters/stylish.js';
import { selectTopHotspots } from './hotspots.js';
import {
  averageAgentSubscores,
  averageIntegrationSubscores,
  computeAllOperationScores,
  computeDocumentScores,
} from './scoring.js';
import type { DebugMediaTypeLog, ScoreResult } from './types.js';

function resolveJsonPointer(root: any, ref: string): any {
  if (!ref.startsWith('#/')) return undefined;
  let node = root;
  for (const segment of ref.slice(2).split('/')) {
    node = node?.[decodeURIComponent(segment)];
  }
  return node;
}

export type ScoreArgv = {
  api?: string;
  format: OutputFormat;
  'operation-details'?: boolean;
  'debug-operation-id'?: string;
} & VerifyConfigOptions;

export async function handleScore({ argv, config, collectSpecData }: CommandArgs<ScoreArgv>) {
  const [{ path }] = await getFallbackApisOrExit(argv.api ? [argv.api] : [], config);
  const externalRefResolver = new BaseResolver(config.resolve);
  const { bundle: document } = await bundle({ config, ref: path });
  collectSpecData?.(document.parsed);

  const specVersion = detectSpec(document.parsed);
  if (!specVersion.startsWith('oas3')) {
    logger.error(
      colors.red(`The score command currently supports only OpenAPI 3.x. Detected: ${specVersion}`)
    );
    process.exitCode = 1;
    return;
  }

  const startedAt = performance.now();

  const types = normalizeTypes(config.extendTypes(getTypes(specVersion), specVersion), config);

  const resolvedRefMap = await resolveDocument({
    rootDocument: document,
    rootType: types.Root,
    externalRefResolver,
  });

  const ctx: WalkContext = {
    problems: [],
    specVersion,
    config,
    visitorsData: {},
  };

  const schemaWalkState = createSchemaWalkState();
  const schemaVisitor = createSchemaMetricVisitor(schemaWalkState);
  const normalizedSchemaVisitors = normalizeVisitors(
    [{ severity: 'warn', ruleId: 'score-schema', visitor: schemaVisitor as any }],
    types
  );

  type SchemaStats = ReturnType<typeof walkSchemaRaw>;

  const walkSchemaRaw = (schemaNode: any, debug: boolean) => {
    resetSchemaWalkState(schemaWalkState);
    if (debug) schemaWalkState.debugEntries = [];
    walkDocument({
      document: { ...document, parsed: schemaNode },
      rootType: types.Schema,
      normalizedVisitors: normalizedSchemaVisitors,
      resolvedRefMap,
      ctx,
    });
    return {
      maxDepth: schemaWalkState.maxDepth,
      polymorphismCount: schemaWalkState.polymorphismCount,
      anyOfCount: schemaWalkState.anyOfCount,
      hasDiscriminator: schemaWalkState.hasDiscriminator,
      propertyCount: schemaWalkState.propertyCount,
      totalSchemaProperties: schemaWalkState.totalSchemaProperties,
      schemaPropertiesWithDescription: schemaWalkState.schemaPropertiesWithDescription,
      constraintCount: schemaWalkState.constraintCount,
      hasPropertyExamples: schemaWalkState.hasPropertyExamples,
      writableTopLevelFields: schemaWalkState.writableTopLevelFields,
      refsUsed: [...schemaWalkState.refsUsed],
      debugEntries: debug ? (schemaWalkState.debugEntries ?? undefined) : undefined,
    };
  };

  const walkSchema = (schemaNode: any, debug = false): SchemaStats => {
    let resolved = schemaNode;
    if (schemaNode?.$ref && typeof schemaNode.$ref === 'string') {
      resolved = resolveJsonPointer(document.parsed, schemaNode.$ref) ?? schemaNode;
    }

    const polyKeyword: 'oneOf' | 'anyOf' | null =
      Array.isArray(resolved?.oneOf) && resolved.oneOf.length > 1
        ? 'oneOf'
        : Array.isArray(resolved?.anyOf) && resolved.anyOf.length > 1
          ? 'anyOf'
          : null;

    if (polyKeyword && !resolved.allOf) {
      const branches = resolved[polyKeyword] as any[];

      const parentOnly = { ...resolved };
      delete parentOnly[polyKeyword];
      delete parentOnly.discriminator;

      let maxBranch = walkSchema(branches[0], debug);
      for (let i = 1; i < branches.length; i++) {
        const branchStats = walkSchema(branches[i], debug);
        if (branchStats.propertyCount > maxBranch.propertyCount) {
          maxBranch = branchStats;
        }
      }

      const parentStats = walkSchemaRaw(parentOnly, debug);

      return combineOneOfStats(parentStats, maxBranch, branches.length, polyKeyword);
    }

    return walkSchemaRaw(schemaNode, debug);
  };

  function combineOneOfStats(
    parent: SchemaStats,
    branch: SchemaStats,
    branchCount: number,
    keyword: 'oneOf' | 'anyOf'
  ): SchemaStats {
    return {
      maxDepth: Math.max(parent.maxDepth, branch.maxDepth + 1),
      polymorphismCount: parent.polymorphismCount + branch.polymorphismCount + branchCount,
      anyOfCount: parent.anyOfCount + branch.anyOfCount + (keyword === 'anyOf' ? branchCount : 0),
      hasDiscriminator: parent.hasDiscriminator || branch.hasDiscriminator,
      propertyCount: parent.propertyCount + branch.propertyCount,
      totalSchemaProperties: parent.totalSchemaProperties + branch.totalSchemaProperties,
      schemaPropertiesWithDescription:
        parent.schemaPropertiesWithDescription + branch.schemaPropertiesWithDescription,
      constraintCount: parent.constraintCount + branch.constraintCount,
      hasPropertyExamples: parent.hasPropertyExamples || branch.hasPropertyExamples,
      writableTopLevelFields: parent.writableTopLevelFields + branch.writableTopLevelFields,
      refsUsed: [...parent.refsUsed, ...branch.refsUsed],
      debugEntries:
        parent.debugEntries || branch.debugEntries
          ? [...(parent.debugEntries ?? []), ...(branch.debugEntries ?? [])]
          : undefined,
    };
  }

  const debugOpId = argv['debug-operation-id'];
  const accumulator = createScoreAccumulator(walkSchema, debugOpId);
  const scoreVisitor = createScoreVisitor(accumulator);

  const normalizedVisitors = normalizeVisitors(
    [{ severity: 'warn', ruleId: 'score', visitor: scoreVisitor as any }],
    types
  );

  walkDocument({
    document,
    rootType: types.Root,
    normalizedVisitors,
    resolvedRefMap,
    ctx,
  });

  const rawMetrics = getDocumentMetrics(accumulator);
  const workflowDepths = computeWorkflowDepths(rawMetrics.operations);
  const operationScores = computeAllOperationScores(rawMetrics, workflowDepths);
  const { integrationSimplicity, agentReadiness } = computeDocumentScores(operationScores);

  const hotspots = selectTopHotspots(rawMetrics, operationScores, workflowDepths);

  const result: ScoreResult = {
    integrationSimplicity,
    agentReadiness,
    integrationSubscores: averageIntegrationSubscores(operationScores),
    agentSubscores: averageAgentSubscores(operationScores),
    rawMetrics,
    hotspots,
    operationScores,
    workflowDepths,
  };

  printScore(
    result,
    path,
    startedAt,
    argv.format,
    !!argv['operation-details'],
    debugOpId ? { operationId: debugOpId, logs: accumulator.debugLogs } : undefined
  );
}

function printScore(
  result: ScoreResult,
  api: string,
  startedAt: number,
  format: string,
  operationDetails: boolean,
  debugData?: { operationId: string; logs: DebugMediaTypeLog[] }
): void {
  logger.info(`Document: ${colors.magenta(api)} score:\n`);

  switch (format) {
    case 'json':
      printScoreJson(result);
      break;
    default:
      printScoreStylish(result, operationDetails);
      break;
  }

  if (debugData) {
    printDebugOperation(debugData.operationId, debugData.logs);
  }

  printExecutionTime('score', startedAt, api);
}
