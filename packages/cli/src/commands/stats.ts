import { performance } from 'perf_hooks';
import * as colors from 'colorette';
import {
  Config,
  StyleguideConfig,
  normalizeTypes,
  BaseResolver,
  resolveDocument,
  detectSpec,
  getTypes,
  normalizeVisitors,
  walkDocument,
  Stats,
  bundle,
} from '@redocly/openapi-core';
import { getFallbackApisOrExit } from '../utils';
import { printExecutionTime } from '../utils';
import type { StatsAccumulator, StatsName, WalkContext, OutputFormat } from '@redocly/openapi-core';

const statsAccumulator: StatsAccumulator = {
  refs: { metric: '🚗 References', total: 0, color: 'red', items: new Set() },
  externalDocs: { metric: '📦 External Documents', total: 0, color: 'magenta' },
  schemas: { metric: '📈 Schemas', total: 0, color: 'white' },
  parameters: { metric: '👉 Parameters', total: 0, color: 'yellow', items: new Set() },
  links: { metric: '🔗 Links', total: 0, color: 'cyan', items: new Set() },
  pathItems: { metric: '➡️  Path Items', total: 0, color: 'green' },
  operations: { metric: '👷 Operations', total: 0, color: 'yellow' },
  tags: { metric: '🔖 Tags', total: 0, color: 'white', items: new Set() },
};

function printStatsStylish(statsAccumulator: StatsAccumulator) {
  for (const node in statsAccumulator) {
    const { metric, total, color } = statsAccumulator[node as StatsName];
    process.stderr.write(colors[color](`${metric}: ${total} \n`));
  }
}

function printStatsJson(statsAccumulator: StatsAccumulator) {
  const json: any = {};
  for (const key of Object.keys(statsAccumulator)) {
    json[key] = {
      metric: statsAccumulator[key as StatsName].metric,
      total: statsAccumulator[key as StatsName].total,
    };
  }
  process.stdout.write(JSON.stringify(json, null, 2));
}

function printStats(statsAccumulator: StatsAccumulator, api: string, format: string) {
  process.stderr.write(`Document: ${colors.magenta(api)} stats:\n\n`);
  switch (format) {
    case 'stylish':
      printStatsStylish(statsAccumulator);
      break;
    case 'json':
      printStatsJson(statsAccumulator);
      break;
  }
}

export type StatsOptions = {
  api?: string;
  format: OutputFormat;
  config?: string;
};

export async function handleStats(argv: StatsOptions, config: Config) {
  const [{ path }] = await getFallbackApisOrExit(argv.api ? [argv.api] : [], config);
  const externalRefResolver = new BaseResolver(config.resolve);
  const { bundle: document } = await bundle({ config, ref: path });
  const lintConfig: StyleguideConfig = config.styleguide;
  const specVersion = detectSpec(document.parsed);
  const types = normalizeTypes(
    lintConfig.extendTypes(getTypes(specVersion), specVersion),
    lintConfig
  );

  const startedAt = performance.now();
  const ctx: WalkContext = {
    problems: [],
    oasVersion: specVersion,
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
        visitor: Stats(statsAccumulator),
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

  printStats(statsAccumulator, path, argv.format);
  printExecutionTime('stats', startedAt, path);
}
