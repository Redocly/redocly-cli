import { performance } from 'perf_hooks';
import * as colors from 'colorette';
import { Config, LintConfig, loadConfig } from '..';
import { normalizeTypes } from '../types';
import { Oas3Types } from '../types/oas3';
import { Oas2Types } from '../types/oas2';
import { Oas2Parameter } from '../typings/swagger';
import { Oas3Parameter, OasRef } from '../typings/openapi';
import { BaseResolver, Document, resolveDocument } from '../resolve';
import { detectOpenAPI, OasMajorVersion, openAPIMajor } from '../validate';
import { normalizeVisitors, Oas2Visitor, Oas3Visitor } from '../visitors';
import { WalkContext, walkDocument } from '../walk';
import { getFallbackEntryPointsOrExit } from '../cli';
import { getExecutionTime } from '../utils';

interface StatsRow {
  metric: string;
  total: number;
  color: 'red' | 'yellow' | 'green' | 'white' | 'magenta' | 'cyan';
  items?: Set<string>;
}
type StatsName = 'operations' | 'refs' | 'tags' | 'externalDocs' | 'pathItems' | 'links' | 'schemas' | 'parameters';
type IStatsCount = Record<StatsName, StatsRow>;

const statsCount: IStatsCount = {
  refs: { metric: '🚗 References', total: 0, color: 'red', items: new Set() },
  externalDocs: { metric: '📦 External Documents', total: 0, color: 'magenta' },
  schemas: { metric: '📈 Schemas', total: 0, color: 'white'},
  parameters: { metric: '👉 Parameters', total: 0, color: 'yellow', items: new Set() },
  links: { metric: '🔗 Links', total: 0, color: 'cyan', items: new Set() },
  pathItems: { metric: '➡️ Path Items', total: 0, color: 'green' },
  operations: { metric: '👷 Operations', total: 0, color: 'yellow' },
  tags: { metric: '🔖 Tags', total: 0, color: 'white' },
}

function printStatsStylish(statsCount: IStatsCount) {
  for (const node in statsCount) {
    const { metric, total, color } = statsCount[node as StatsName];
    process.stderr.write(colors[color](`${metric}: ${total} \n`));
  }
}

function printStatsJson(statsCount: IStatsCount) {
  const json: any = {};
  for (const key of Object.keys(statsCount)) {
    json[key] = {
      metric: statsCount[key as StatsName].metric,
      total: statsCount[key as StatsName].total,
    }
  }
  process.stdout.write(JSON.stringify(json, null, 2));
}

function printStats(statsCount: IStatsCount, entrypoint: string, format: string) {
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

  const statVisitor: Oas3Visitor | Oas2Visitor = {
    ExternalDocs: { leave() { statsCount.externalDocs.total++; }},
    ref: { enter(ref: OasRef) { statsCount.refs.items!.add(ref['$ref']); }},
    Tag: { enter() { statsCount.tags.total++; }},
    Link: { leave(link: any) { statsCount.links.items!.add(link.operationId); }},
    PathMap: {
      leave() {
        statsCount.parameters.total = statsCount.parameters.items!.size;
        statsCount.refs.total = statsCount.refs.items!.size;
        statsCount.links.total = statsCount.links.items!.size;
      },
      PathItem: {
        leave() { statsCount.pathItems.total++; },
        Operation: { leave() { statsCount.operations.total++; }},
        Parameter: { leave(parameter: Oas2Parameter | Oas3Parameter) {
          statsCount.parameters.items!.add(parameter.name)
        }}
      }
    },
    NamedSchemas: {
      Schema: { leave() { statsCount.schemas.total++; }}
    }
  }

  const statsVisitor = normalizeVisitors([{
    severity: 'warn',
    ruleId: 'stats',
    visitor: statVisitor
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
