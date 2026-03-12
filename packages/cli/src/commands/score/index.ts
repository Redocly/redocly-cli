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
} from '@redocly/openapi-core';
import type { OutputFormat, WalkContext } from '@redocly/openapi-core';
import * as colors from 'colorette';
import { performance } from 'perf_hooks';

import type { VerifyConfigOptions } from '../../types.js';
import { getFallbackApisOrExit, printExecutionTime } from '../../utils/miscellaneous.js';
import type { CommandArgs } from '../../wrapper.js';
import {
  createScoreAccumulator,
  createScoreVisitor,
  getDocumentMetrics,
} from './collectors/document-metrics.js';
import { computeWorkflowDepths } from './collectors/workflow-graph.js';
import { printScoreJson } from './formatters/json.js';
import { printScoreStylish } from './formatters/stylish.js';
import { selectTopHotspots } from './hotspots.js';
import { computeAllOperationScores, computeDocumentScores } from './scoring.js';
import type {
  AgentReadinessSubscores,
  IntegrationSimplicitySubscores,
  ScoreResult,
} from './types.js';

export type ScoreArgv = {
  api?: string;
  format: OutputFormat;
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
  const accumulator = createScoreAccumulator();
  const scoreVisitor = createScoreVisitor(accumulator);

  const resolvedRefMap = await resolveDocument({
    rootDocument: document,
    rootType: types.Root,
    externalRefResolver,
  });

  const walkCtx: WalkContext = {
    problems: [],
    specVersion,
    config,
    visitorsData: {},
  };

  const normalizedVisitors = normalizeVisitors(
    [{ severity: 'warn', ruleId: 'score', visitor: scoreVisitor as any }],
    types
  );

  walkDocument({
    document,
    rootType: types.Root,
    normalizedVisitors,
    resolvedRefMap,
    ctx: walkCtx,
  });

  const rawMetrics = getDocumentMetrics(accumulator);
  const workflowDepths = computeWorkflowDepths(rawMetrics.operations);
  const operationScores = computeAllOperationScores(rawMetrics, workflowDepths);
  const { integrationSimplicity, agentReadiness } = computeDocumentScores(operationScores);

  const hotspots = selectTopHotspots(rawMetrics, operationScores, workflowDepths);

  const avgIntSubscores = averageIntegrationSubscores(operationScores);
  const avgAgentSubscores = averageAgentSubscores(operationScores);

  const result: ScoreResult = {
    integrationSimplicity,
    agentReadiness,
    integrationSubscores: avgIntSubscores,
    agentSubscores: avgAgentSubscores,
    rawMetrics,
    hotspots,
    operationScores,
    workflowDepths,
  };

  logger.info(`Document: ${colors.magenta(path)} score:\n`);

  switch (argv.format) {
    case 'json':
      printScoreJson(result);
      break;
    default:
      printScoreStylish(result);
      break;
  }

  printExecutionTime('score', startedAt, path);
}

function averageIntegrationSubscores(
  operationScores: Map<string, { integrationSubscores: IntegrationSimplicitySubscores }>
): IntegrationSimplicitySubscores {
  const n = operationScores.size || 1;
  const result: IntegrationSimplicitySubscores = {
    parameterSimplicity: 0,
    schemaSimplicity: 0,
    documentationQuality: 0,
    constraintClarity: 0,
    exampleCoverage: 0,
    errorClarity: 0,
    workflowClarity: 0,
  };

  for (const scores of operationScores.values()) {
    result.parameterSimplicity += scores.integrationSubscores.parameterSimplicity;
    result.schemaSimplicity += scores.integrationSubscores.schemaSimplicity;
    result.documentationQuality += scores.integrationSubscores.documentationQuality;
    result.constraintClarity += scores.integrationSubscores.constraintClarity;
    result.exampleCoverage += scores.integrationSubscores.exampleCoverage;
    result.errorClarity += scores.integrationSubscores.errorClarity;
    result.workflowClarity += scores.integrationSubscores.workflowClarity;
  }

  result.parameterSimplicity /= n;
  result.schemaSimplicity /= n;
  result.documentationQuality /= n;
  result.constraintClarity /= n;
  result.exampleCoverage /= n;
  result.errorClarity /= n;
  result.workflowClarity /= n;

  return result;
}

function averageAgentSubscores(
  operationScores: Map<string, { agentSubscores: AgentReadinessSubscores }>
): AgentReadinessSubscores {
  const n = operationScores.size || 1;
  const result: AgentReadinessSubscores = {
    documentationQuality: 0,
    constraintClarity: 0,
    exampleCoverage: 0,
    errorClarity: 0,
    identifierClarity: 0,
    workflowClarity: 0,
    polymorphismClarity: 0,
  };

  for (const scores of operationScores.values()) {
    result.documentationQuality += scores.agentSubscores.documentationQuality;
    result.constraintClarity += scores.agentSubscores.constraintClarity;
    result.exampleCoverage += scores.agentSubscores.exampleCoverage;
    result.errorClarity += scores.agentSubscores.errorClarity;
    result.identifierClarity += scores.agentSubscores.identifierClarity;
    result.workflowClarity += scores.agentSubscores.workflowClarity;
    result.polymorphismClarity += scores.agentSubscores.polymorphismClarity;
  }

  result.documentationQuality /= n;
  result.constraintClarity /= n;
  result.exampleCoverage /= n;
  result.errorClarity /= n;
  result.identifierClarity /= n;
  result.workflowClarity /= n;
  result.polymorphismClarity /= n;

  return result;
}
