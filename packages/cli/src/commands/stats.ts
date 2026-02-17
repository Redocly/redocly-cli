import { performance } from 'perf_hooks';
import * as colors from 'colorette';
import {
  normalizeTypes,
  BaseResolver,
  resolveDocument,
  detectSpec,
  getTypes,
  normalizeVisitors,
  walkDocument,
  Stats,
  bundle,
  logger,
} from '@redocly/openapi-core';
import { getFallbackApisOrExit, printExecutionTime } from '../utils/miscellaneous.js';

import type {
  StatsAccumulator,
  StatsName,
  WalkContext,
  OutputFormat,
  SpecVersion,
} from '@redocly/openapi-core';
import type { CommandArgs } from '../wrapper.js';
import type { VerifyConfigOptions } from '../types.js';

const statsAccumulator: StatsAccumulator = {
  refs: { metric: '🚗 References', total: 0, color: 'red', items: new Set() },
  externalDocs: { metric: '📦 External Documents', total: 0, color: 'magenta' },
  schemas: { metric: '📈 Schemas', total: 0, color: 'white' },
  parameters: { metric: '👉 Parameters', total: 0, color: 'yellow', items: new Set() },
  links: { metric: '🔗 Links', total: 0, color: 'cyan', items: new Set() },
  pathItems: { metric: '🔀 Path Items', total: 0, color: 'green' },
  channels: { metric: '📡 Channels', total: 0, color: 'green' },
  webhooks: { metric: '🎣 Webhooks', total: 0, color: 'green' },
  operations: { metric: '👷 Operations', total: 0, color: 'yellow' },
  tags: { metric: '🔖 Tags', total: 0, color: 'white', items: new Set() },
};

// Determine which stats are relevant for a given spec version
function isStatRelevant(stat: StatsName, specVersion: SpecVersion): boolean {
  // AsyncAPI-specific stats
  if (stat === 'channels') {
    return specVersion === 'async2' || specVersion === 'async3';
  }

  // OpenAPI-specific stats
  if (stat === 'pathItems' || stat === 'webhooks' || stat === 'links') {
    return specVersion !== 'async2' && specVersion !== 'async3';
  }

  // Common stats (refs, externalDocs, schemas, parameters, operations, tags)
  return true;
}

function printStatsStylish(statsAccumulator: StatsAccumulator, specVersion: SpecVersion) {
  for (const node in statsAccumulator) {
    const statName = node as StatsName;
    if (!isStatRelevant(statName, specVersion)) continue;

    const { metric, total, color } = statsAccumulator[statName];
    logger.output(colors[color](`${metric}: ${total} \n`));
  }
}

function printStatsJson(statsAccumulator: StatsAccumulator, specVersion: SpecVersion) {
  const json: any = {};
  for (const key of Object.keys(statsAccumulator)) {
    const statName = key as StatsName;
    if (!isStatRelevant(statName, specVersion)) continue;

    json[key] = {
      metric: statsAccumulator[statName].metric,
      total: statsAccumulator[statName].total,
    };
  }

  logger.output(JSON.stringify(json, null, 2));
}

function printStatsMarkdown(statsAccumulator: StatsAccumulator, specVersion: SpecVersion) {
  let output = '| Feature  | Count  |\n| --- | --- |\n';
  for (const key of Object.keys(statsAccumulator)) {
    const statName = key as StatsName;
    if (!isStatRelevant(statName, specVersion)) continue;

    output +=
      '| ' + statsAccumulator[statName].metric + ' | ' + statsAccumulator[statName].total + ' |\n';
  }

  logger.output(output);
}

function printStats(
  statsAccumulator: StatsAccumulator,
  api: string,
  startedAt: number,
  format: string,
  specVersion: SpecVersion
) {
  logger.info(`Document: ${colors.magenta(api)} stats:\n\n`);

  switch (format) {
    case 'stylish':
      printStatsStylish(statsAccumulator, specVersion);
      break;
    case 'json':
      printStatsJson(statsAccumulator, specVersion);
      break;
    case 'markdown':
      printStatsMarkdown(statsAccumulator, specVersion);
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

  const statsVisitor = normalizeVisitors(
    [
      {
        severity: 'warn',
        ruleId: 'stats',
        visitor: Stats(statsAccumulator, specVersion),
      },
    ],
    types
  );

  walkDocument({
    document,
    rootType: types.Root,
    normalizedVisitors: statsVisitor,
    resolvedRefMap,
    ctx,
  });

  printStats(statsAccumulator, path, startedAt, argv.format, specVersion);
}
