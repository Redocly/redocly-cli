import {
  normalizeTypes,
  BaseResolver,
  resolveDocument,
  detectSpec,
  getMajorSpecVersion,
  getTypes,
  bundle,
  logger,
  type OutputFormat,
} from '@redocly/openapi-core';
import * as colors from 'colorette';
import { performance } from 'perf_hooks';

import type { VerifyConfigOptions } from '../../types.js';
import { exitWithError } from '../../utils/error.js';
import { getFallbackApisOrExit, printExecutionTime } from '../../utils/miscellaneous.js';
import type { CommandArgs } from '../../wrapper.js';
import { collectMetrics } from './collect-metrics.js';
import { computeDependencyDepths } from './collectors/dependency-graph.js';
import { printScoreJson } from './formatters/json.js';
import { printDebugOperation, printScoreStylish } from './formatters/stylish.js';
import { selectTopHotspots } from './hotspots.js';
import {
  aggregateSubscores,
  computeAllOperationScores,
  computeDiscoverability,
  computeDocumentScores,
} from './scoring.js';
import type { DebugMediaTypeLog, ScoreResult } from './types.js';

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
  if (getMajorSpecVersion(specVersion) !== 'oas3') {
    return exitWithError(
      `The score command currently supports only OpenAPI 3.x. Detected: ${specVersion}`
    );
  }

  const startedAt = performance.now();

  const types = normalizeTypes(config.extendTypes(getTypes(specVersion), specVersion), config);

  const resolvedRefMap = await resolveDocument({
    rootDocument: document,
    rootType: types.Root,
    externalRefResolver,
  });

  const debugOpId = argv['debug-operation-id'];
  // Non-default scoring constants must be passed both to collectMetrics and computeAllOperationScores.
  const { metrics: rawMetrics, debugLogs } = collectMetrics({
    document,
    types,
    resolvedRefMap,
    ctx: { problems: [], specVersion, config, visitorsData: {} },
    debugOperationId: debugOpId,
  });

  const dependencyDepths = computeDependencyDepths(rawMetrics.operations);
  const operationScores = computeAllOperationScores(rawMetrics, dependencyDepths);
  const discoverability = computeDiscoverability(rawMetrics.operationCount);
  const { agentReadiness } = computeDocumentScores(operationScores, discoverability);

  const hotspots = selectTopHotspots(rawMetrics, operationScores, dependencyDepths);

  const result: ScoreResult = {
    agentReadiness,
    discoverability,
    subscores: aggregateSubscores(operationScores),
    rawMetrics,
    hotspots,
    operationScores,
    dependencyDepths,
  };

  printScore(
    result,
    path,
    startedAt,
    argv.format,
    !!argv['operation-details'],
    debugOpId ? { operationId: debugOpId, logs: debugLogs } : undefined
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
    case 'stylish':
    default:
      printScoreStylish(result, operationDetails);
      break;
  }

  if (debugData) {
    printDebugOperation(debugData.operationId, debugData.logs);
  }

  printExecutionTime('score', startedAt, api);
}
