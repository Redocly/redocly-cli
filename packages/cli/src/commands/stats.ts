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
  StatsOAS,
  StatsAsync2,
  StatsAsync3,
  bundle,
  logger,
} from '@redocly/openapi-core';
import { getFallbackApisOrExit, printExecutionTime } from '../utils/miscellaneous.js';

import type { StatsAccumulator, StatsName, WalkContext, OutputFormat } from '@redocly/openapi-core';
import type { CommandArgs } from '../wrapper.js';
import type { VerifyConfigOptions } from '../types.js';

// OpenAPI stats accumulator
const createOASStatsAccumulator = (): StatsAccumulator => ({
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
});

// AsyncAPI stats accumulator
const createAsyncAPIStatsAccumulator = (): StatsAccumulator => ({
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
});

// Stats to show for OpenAPI
const oasStatsToShow: Set<StatsName> = new Set([
  'refs',
  'externalDocs',
  'schemas',
  'parameters',
  'links',
  'pathItems',
  'webhooks',
  'operations',
  'tags',
]);

// Stats to show for AsyncAPI
const asyncStatsToShow: Set<StatsName> = new Set([
  'refs',
  'externalDocs',
  'schemas',
  'parameters',
  'channels',
  'operations',
  'tags',
]);

function printStatsStylish(statsAccumulator: StatsAccumulator, statsToShow: Set<StatsName>) {
  for (const node in statsAccumulator) {
    const statName = node as StatsName;
    if (!statsToShow.has(statName)) continue;

    const { metric, total, color } = statsAccumulator[statName];
    logger.output(colors[color](`${metric}: ${total} \n`));
  }
}

function printStatsJson(statsAccumulator: StatsAccumulator, statsToShow: Set<StatsName>) {
  const json: any = {};
  for (const key of Object.keys(statsAccumulator)) {
    const statName = key as StatsName;
    if (!statsToShow.has(statName)) continue;

    json[key] = {
      metric: statsAccumulator[statName].metric,
      total: statsAccumulator[statName].total,
    };
  }

  logger.output(JSON.stringify(json, null, 2));
}

function printStatsMarkdown(statsAccumulator: StatsAccumulator, statsToShow: Set<StatsName>) {
  let output = '| Feature  | Count  |\n| --- | --- |\n';
  for (const key of Object.keys(statsAccumulator)) {
    const statName = key as StatsName;
    if (!statsToShow.has(statName)) continue;

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
  statsToShow: Set<StatsName>
) {
  logger.info(`Document: ${colors.magenta(api)} stats:\n\n`);

  switch (format) {
    case 'stylish':
      printStatsStylish(statsAccumulator, statsToShow);
      break;
    case 'json':
      printStatsJson(statsAccumulator, statsToShow);
      break;
    case 'markdown':
      printStatsMarkdown(statsAccumulator, statsToShow);
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

  // Create appropriate accumulator and visitor based on spec version
  const isAsyncAPI = specVersion === 'async2' || specVersion === 'async3';
  const statsAccumulator = isAsyncAPI
    ? createAsyncAPIStatsAccumulator()
    : createOASStatsAccumulator();
  const statsToShow = isAsyncAPI ? asyncStatsToShow : oasStatsToShow;

  const statsVisitorFn =
    specVersion === 'async2' ? StatsAsync2 : specVersion === 'async3' ? StatsAsync3 : StatsOAS;

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
        visitor: statsVisitorFn(statsAccumulator),
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

  printStats(statsAccumulator, path, startedAt, argv.format, statsToShow);
}
