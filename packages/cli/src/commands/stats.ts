import {
  normalizeTypes,
  BaseResolver,
  resolveDocument,
  detectSpec,
  getTypes,
  normalizeVisitors,
  walkDocument,
  StatsOAS,
  StatsAsync2,
  StatsAsync3,
  bundle,
  logger,
} from '@redocly/openapi-core';
import type {
  OASStatsAccumulator,
  AsyncAPIStatsAccumulator,
  WalkContext,
  OutputFormat,
} from '@redocly/openapi-core';
import * as colors from 'colorette';
import { performance } from 'perf_hooks';

import type { VerifyConfigOptions } from '../types.js';
import { exitWithError } from '../utils/error.js';
import { getFallbackApisOrExit, printExecutionTime } from '../utils/miscellaneous.js';
import type { CommandArgs } from '../wrapper.js';

function printStatsStylish(statsAccumulator: OASStatsAccumulator | AsyncAPIStatsAccumulator) {
  for (const node in statsAccumulator) {
    const stat = statsAccumulator[node as keyof typeof statsAccumulator];
    const { metric, total, color } = stat;
    const colorFn = colors[color as keyof typeof colors] as (text: string) => string;
    logger.output(colorFn(`${metric}: ${total} \n`));
  }
}

function printStatsJson(statsAccumulator: OASStatsAccumulator | AsyncAPIStatsAccumulator) {
  const json: any = {};
  for (const key of Object.keys(statsAccumulator)) {
    const stat = statsAccumulator[key as keyof typeof statsAccumulator];
    json[key] = {
      metric: stat.metric,
      total: stat.total,
    };
  }

  logger.output(JSON.stringify(json, null, 2));
}

function printStatsMarkdown(statsAccumulator: OASStatsAccumulator | AsyncAPIStatsAccumulator) {
  let output = '| Feature  | Count  |\n| --- | --- |\n';
  for (const key of Object.keys(statsAccumulator)) {
    const stat = statsAccumulator[key as keyof typeof statsAccumulator];
    output += '| ' + stat.metric + ' | ' + stat.total + ' |\n';
  }

  logger.output(output);
}

function printStats(
  statsAccumulator: OASStatsAccumulator | AsyncAPIStatsAccumulator,
  api: string,
  startedAt: number,
  format: string
) {
  logger.info(`Document: ${colors.magenta(api)} stats:\n\n`);

  switch (format) {
    case 'stylish':
      printStatsStylish(statsAccumulator);
      break;
    case 'json':
      printStatsJson(statsAccumulator);
      break;
    case 'markdown':
      printStatsMarkdown(statsAccumulator);
      break;
  }

  printExecutionTime('stats', startedAt, api);
}

export type StatsArgv = {
  api?: string;
  format: OutputFormat;
} & VerifyConfigOptions;

export async function handleStats({ argv, config, collectSpecData }: CommandArgs<StatsArgv>) {
  const [{ path }] = await getFallbackApisOrExit(argv.api ? [argv.api] : [], config);
  const externalRefResolver = new BaseResolver(config.resolve);
  const { bundle: document } = await bundle({ config, ref: path });
  collectSpecData?.(document.parsed);
  const specVersion = detectSpec(document.parsed);
  const types = normalizeTypes(config.extendTypes(getTypes(specVersion), specVersion), config);

  const statsAccumulatorOAS: OASStatsAccumulator = {
    refs: { metric: '🚗 References', total: 0, color: 'red', items: new Set() },
    externalDocs: { metric: '📦 External Documents', total: 0, color: 'magenta' },
    schemas: { metric: '📈 Schemas', total: 0, color: 'white' },
    parameters: { metric: '👉 Parameters', total: 0, color: 'yellow', items: new Set() },
    links: { metric: '🔗 Links', total: 0, color: 'cyan', items: new Set() },
    pathItems: { metric: '🔀 Path Items', total: 0, color: 'green' },
    webhooks: { metric: '🎣 Webhooks', total: 0, color: 'green' },
    operations: { metric: '👷 Operations', total: 0, color: 'yellow' },
    tags: { metric: '🔖 Tags', total: 0, color: 'white', items: new Set() },
  };
  const statsAccumulatorAsync: AsyncAPIStatsAccumulator = {
    refs: { metric: '🚗 References', total: 0, color: 'red', items: new Set() },
    externalDocs: { metric: '📦 External Documents', total: 0, color: 'magenta' },
    schemas: { metric: '📈 Schemas', total: 0, color: 'white' },
    parameters: { metric: '👉 Parameters', total: 0, color: 'yellow', items: new Set() },
    channels: { metric: '📡 Channels', total: 0, color: 'green' },
    operations: { metric: '👷 Operations', total: 0, color: 'yellow' },
    tags: { metric: '🔖 Tags', total: 0, color: 'white', items: new Set() },
  };

  let statsVisitor, statsAccumulator;
  switch (specVersion) {
    case 'async2':
      statsAccumulator = statsAccumulatorAsync;
      statsVisitor = StatsAsync2(statsAccumulator);
      break;
    case 'async3':
      statsAccumulator = statsAccumulatorAsync;
      statsVisitor = StatsAsync3(statsAccumulator);
      break;
    case 'oas2':
    case 'oas3_0':
    case 'oas3_1':
    case 'oas3_2':
      statsAccumulator = statsAccumulatorOAS;
      statsVisitor = StatsOAS(statsAccumulator);
      break;
    default:
      return exitWithError(`Unsupported spec version: ${specVersion}.`);
  }

  const startedAt = performance.now();
  const ctx: WalkContext = {
    problems: [],
    specVersion,
    config,
    visitorsData: {},
  };

  const resolvedRefMap = await resolveDocument({
    rootDocument: document,
    rootType: types.Root,
    externalRefResolver,
  });

  const normalizedStatsVisitor = normalizeVisitors(
    [
      {
        severity: 'warn',
        ruleId: 'stats',
        visitor: statsVisitor,
      },
    ],
    types
  );

  walkDocument({
    document,
    rootType: types.Root,
    normalizedVisitors: normalizedStatsVisitor,
    resolvedRefMap,
    ctx,
  });

  printStats(statsAccumulator, path, startedAt, argv.format);
}
