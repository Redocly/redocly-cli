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
  HandledError,
  type Config,
} from '@redocly/openapi-core';
import * as colors from 'colorette';
import { performance } from 'perf_hooks';

import { renderBanner } from '../../utils/banner.js';
import { getFallbackApisOrExit, printExecutionTime } from '../../utils/miscellaneous.js';
import type { CommandArgs } from '../../wrapper.js';
import { collectMetrics } from './collect-metrics.js';
import { computeDependencyDepths } from './collectors/dependency-graph.js';
import { printScoreJson } from './formatters/json.js';
import { printDebugOperation, printScoreStylish } from './formatters/stylish.js';
import { selectTopHotspots } from './hotspots.js';
import { getRecommendations } from './recommendations.js';
import {
  aggregateSubscores,
  computeAllOperationScores,
  computeDiscoverability,
  computeDocumentScores,
} from './scoring.js';
import type { DebugMediaTypeLog, ScoreResult } from './types.js';

const SCORE_DOCS_URL = 'https://redocly.com/docs/cli/commands/score?source=cli';

export type ScoreArgv = {
  api?: string;
  format: OutputFormat;
  'operation-details'?: boolean;
  'debug-operation-id'?: string;
};

export async function handleScore({ argv, config, collectSpecData }: CommandArgs<ScoreArgv>) {
  // FIXME: replace this line with `const { api } = argv;` when `getDeprecatedFirstApi` goes.
  // The first API stays out of `argv`, so the usage data shows that the run had no API argument.
  const api = argv.api ?? getDeprecatedFirstApi(config);
  if (api === undefined) {
    throw new HandledError('No API to process. Pass an API to the command: `redocly score <api>`.');
  }
  const [{ path }] = await getFallbackApisOrExit([api], config);
  const externalRefResolver = new BaseResolver(config.resolve);
  const { bundle: document } = await bundle({ config, ref: path });
  collectSpecData?.(document);

  const specVersion = detectSpec(document.parsed);
  if (getMajorSpecVersion(specVersion) !== 'oas3') {
    throw new HandledError(
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
    ...getRecommendations(rawMetrics, dependencyDepths, agentReadiness),
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

  logger.info(`Learn how to improve the score: ${SCORE_DOCS_URL}\n`);
}

// FIXME: remove this function when the deprecation period ends, a week to a month after the release.
// Before, `score` without an API took the first API of the configuration file.
// Such a run now fails, because the command processes one API, which the command line names.
// Until then, it gets the first API as its `api` argument and a deprecation banner.
// `build-docs`, `stats`, `score`, and `scorecard-classic` each hold a copy of this function.
function getDeprecatedFirstApi(config: Config): string | undefined {
  const [firstApi] = Object.keys(config.resolvedConfig.apis ?? {});
  if (firstApi !== undefined) {
    logger.info(
      renderBanner([
        'Deprecated: score without an API takes the first API of the configuration file.',
        'A later release requires the API.',
        `Pass the API: ${colors.cyan('redocly score <api>')}`,
      ])
    );
  }
  return firstApi;
}
