import { performance } from 'perf_hooks';
import * as colors from 'colorette';
import { Config, LintConfig, loadConfig } from '..';
import { normalizeTypes } from '../types';
import { Oas3Types } from '../types/oas3';
import { Oas2Types } from '../types/oas2';
import { StatsCount, StatsName } from '../typings/common';
import { BaseResolver, Document, resolveDocument } from '../resolve';
import { detectOpenAPI, OasMajorVersion, openAPIMajor } from '../validate';
import { normalizeVisitors } from '../visitors';
import { WalkContext, walkDocument } from '../walk';
import { getFallbackEntryPointsOrExit } from '../cli';
import { getExecutionTime } from '../utils';
import { makeStatsVisitor } from '../rules/common/stats';

const statsCount: StatsCount = {
  refs: { metric: '🚗 References', total: 0, color: 'red', items: new Set() },
  externalDocs: { metric: '📦 External Documents', total: 0, color: 'magenta' },
  schemas: { metric: '📈 Schemas', total: 0, color: 'white'},
  parameters: { metric: '👉 Parameters', total: 0, color: 'yellow', items: new Set() },
  links: { metric: '🔗 Links', total: 0, color: 'cyan', items: new Set() },
  pathItems: { metric: '➡️ Path Items', total: 0, color: 'green' },
  operations: { metric: '👷 Operations', total: 0, color: 'yellow' },
  tags: { metric: '🔖 Tags', total: 0, color: 'white' },
}

function printStatsStylish(statsCount: StatsCount) {
  for (const node in statsCount) {
    const { metric, total, color } = statsCount[node as StatsName];
    process.stderr.write(colors[color](`${metric}: ${total} \n`));
  }
}

function printStatsJson(statsCount: StatsCount) {
  const json: any = {};
  for (const key of Object.keys(statsCount)) {
    json[key] = {
      metric: statsCount[key as StatsName].metric,
      total: statsCount[key as StatsName].total,
    }
  }
  process.stdout.write(JSON.stringify(json, null, 2));
}

function printStats(statsCount: StatsCount, entrypoint: string, format: string) {
  process.stderr.write(`Document: ${colors.magenta(entrypoint)} stats:\n\n`);
  switch (format) {
    case 'stylish': printStatsStylish(statsCount); break;
    case 'json': printStatsJson(statsCount); break;
  }
}

function printExecutionTime(startedAt: number, entrypoint: string) {
  const elapsed = getExecutionTime(startedAt);
  process.stderr.write(colors.gray(`\n${entrypoint}: stats processed in ${elapsed}\n\n`));
}

export async function handleStats (argv: {
  config?: string;
  entrypoint?: string;
  format: string;
}) {
  const config: LintConfig | Config = await loadConfig(argv.config);
  const entrypoints = await getFallbackEntryPointsOrExit(argv.entrypoint ? [argv.entrypoint] : [], config);
  const entrypoint = entrypoints[0];
  const externalRefResolver = new BaseResolver(config.resolve);
  const document = (await externalRefResolver.resolveDocument(null, entrypoint)) as Document;
  const lintConfig: LintConfig = config.lint;
  const oasVersion = detectOpenAPI(document.parsed);
  const oasMajorVersion = openAPIMajor(oasVersion);
  const types = normalizeTypes(
    lintConfig.extendTypes(
      oasMajorVersion === OasMajorVersion.Version3 ? Oas3Types : Oas2Types,
      oasVersion,
    ),
  );

  const startedAt = performance.now();
  const ctx: WalkContext = {
    problems: [],
    oasVersion: oasVersion,
  }

  const resolvedRefMap = await resolveDocument({
    rootDocument: document,
    rootType: types.DefinitionRoot,
    externalRefResolver,
  });

  const statsVisitor = normalizeVisitors([{
    severity: 'warn',
    ruleId: 'stats',
    visitor: makeStatsVisitor(statsCount)
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

  printStats(statsCount, entrypoint, argv.format);
  printExecutionTime(startedAt, entrypoint);
}
