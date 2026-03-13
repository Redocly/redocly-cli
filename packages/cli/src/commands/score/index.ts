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
import {
  averageAgentSubscores,
  averageIntegrationSubscores,
  computeAllOperationScores,
  computeDocumentScores,
} from './scoring.js';
import type { ScoreResult } from './types.js';

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

  const ctx: WalkContext = {
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

  printScore(result, path, startedAt, argv.format);
}

function printScore(result: ScoreResult, api: string, startedAt: number, format: string): void {
  logger.info(`Document: ${colors.magenta(api)} score:\n`);

  switch (format) {
    case 'json':
      printScoreJson(result);
      break;
    default:
      printScoreStylish(result);
      break;
  }

  printExecutionTime('score', startedAt, api);
}
