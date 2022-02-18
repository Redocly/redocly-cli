import { performance } from 'perf_hooks';
import * as colors from 'colorette';
import {
  Config,
  LintConfig,
  loadConfig,
  normalizeTypes,
  Oas3Types,
  Oas2Types,
  StatsAccumulator,
  StatsName,
  BaseResolver,
  resolveDocument,
  detectOpenAPI,
  OasMajorVersion,
  openAPIMajor,
  normalizeVisitors,
  WalkContext,
  walkDocument,
  Stats,
  bundle
} from '@redocly/openapi-core';

import { getFallbackEntryPointsOrExit } from '../utils'
import { printExecutionTime } from '../utils';

const statsAccumulator: StatsAccumulator = {
  refs: { metric: '🚗 References', total: 0, color: 'red', items: new Set() },
  externalDocs: { metric: '📦 External Documents', total: 0, color: 'magenta' },
  schemas: { metric: '📈 Schemas', total: 0, color: 'white'},
  parameters: { metric: '👉 Parameters', total: 0, color: 'yellow', items: new Set() },
  links: { metric: '🔗 Links', total: 0, color: 'cyan', items: new Set() },
  pathItems: { metric: '➡️ Path Items', total: 0, color: 'green' },
  operations: { metric: '👷 Operations', total: 0, color: 'yellow' },
  tags: { metric: '🔖 Tags', total: 0, color: 'white', items: new Set() },
}

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
    }
  }
  process.stdout.write(JSON.stringify(json, null, 2));
}

function printStats(statsAccumulator: StatsAccumulator, entrypoint: string, format: string) {
  process.stderr.write(`Document: ${colors.magenta(entrypoint)} stats:\n\n`);
  switch (format) {
    case 'stylish': printStatsStylish(statsAccumulator); break;
    case 'json': printStatsJson(statsAccumulator); break;
  }
}

export async function handleStats (argv: {
  config?: string;
  entrypoint?: string;
  format: string;
}) {
  const config: Config = await loadConfig(argv.config);
  const [{ path }] = await getFallbackEntryPointsOrExit(argv.entrypoint ? [argv.entrypoint] : [], config);
  const externalRefResolver = new BaseResolver(config.resolve);
  const { bundle: document } = await bundle({ config, ref: path });
  const lintConfig: LintConfig = config.lint;
  const oasVersion = detectOpenAPI(document.parsed);
  const oasMajorVersion = openAPIMajor(oasVersion);
  const types = normalizeTypes(
    lintConfig.extendTypes(
      oasMajorVersion === OasMajorVersion.Version3 ? Oas3Types : Oas2Types,
      oasVersion,
    ),
    lintConfig
  );

  const startedAt = performance.now();
  const ctx: WalkContext = {
    problems: [],
    oasVersion: oasVersion,
    visitorsData: {},
  }

  const resolvedRefMap = await resolveDocument({
    rootDocument: document,
    rootType: types.DefinitionRoot,
    externalRefResolver,
  });

  const statsVisitor = normalizeVisitors([{
    severity: 'warn',
    ruleId: 'stats',
    visitor: Stats(statsAccumulator)
  }],
    types
  );

  walkDocument({
    document,
    rootType: types.DefinitionRoot,
    normalizedVisitors: statsVisitor,
    resolvedRefMap,
    ctx,
  });

  printStats(statsAccumulator, path, argv.format);
  printExecutionTime('stats', startedAt, path);
}
