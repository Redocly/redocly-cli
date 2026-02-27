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
import type {
  OASStatsAccumulator,
  AsyncAPIStatsAccumulator,
  WalkContext,
  OutputFormat,
} from '@redocly/openapi-core';
import * as colors from 'colorette';
import { performance } from 'perf_hooks';

import type { VerifyConfigOptions } from '../../types.js';
import { getFallbackApisOrExit, printExecutionTime } from '../../utils/miscellaneous.js';
import type { CommandArgs } from '../../wrapper.js';
import { resolveStatsVisitorAndAccumulator } from './visitor-and-accumulator-resolver.js';

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

  const { statsVisitor, statsAccumulator } = resolveStatsVisitorAndAccumulator(specVersion);

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
