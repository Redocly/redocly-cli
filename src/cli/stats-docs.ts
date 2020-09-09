import { Config, LintConfig, loadConfig } from '..';
import { BaseResolver, Document, resolveDocument } from '../resolve';
import { detectOpenAPI, OasMajorVersion, openAPIMajor } from '../validate';
import { normalizeTypes } from '../types';
import { Oas3Types } from '../types/oas3';
import { Oas2Types } from '../types/oas2';
import { WalkContext, walkDocument } from '../walk';
import { normalizeVisitors, Oas2Visitor, Oas3Visitor } from '../visitors';
import * as colors from 'colorette';
import { getFallbackEntryPointsOrExit } from '../cli';

interface IStatsRow {
  metric: string;
  total: number;
  color: 'red' | 'yellow' | 'green' | 'white' | 'magenta' | 'cyan';
}
type StatsName = 'operations' | 'refs' | 'tags' | 'externalDocs' | 'pathItems' | 'links';
type IStatsCount = Record<StatsName, IStatsRow>;

const statsCount: IStatsCount = {
  operations: { metric: '👷 Operations', total: 0, color: 'yellow' },
  refs: { metric: '🚗 References', total: 0, color: 'red' },
  tags: { metric: '🔖 Tags', total: 0, color: 'white' },
  externalDocs: { metric: '📦 External Documents', total: 0, color: 'magenta' },
  pathItems: { metric: '➡️ Path Items', total: 0, color: 'green' },
  links: { metric: '🔗 Links', total: 0, color: 'cyan' },
}

export const statsArgvOptions: any = {
  config: {
    description: 'Specify path to the config file.',
    type: 'string'
  }
}

function printStatsTable(statsCount: IStatsCount) {
  for (const node in statsCount) {
    const { metric, total, color } = statsCount[node as StatsName];
    process.stderr.write(colors[color](`${metric}: ${total} \n`))
  }
}

export async function handleStats (argv: {
  config?: string;
  entrypoint?: string;
}) {
  const config: LintConfig | Config = await loadConfig(argv.config);
  const entrypoint = getFallbackEntryPointsOrExit(argv.entrypoint ? [argv.entrypoint] : [], config)[0];
  const externalRefResolver = new BaseResolver(config.resolve)
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

  const ctx: WalkContext = {
    problems: [],
    oasVersion: oasVersion,
  }

  const resolvedRefMap = await resolveDocument({
    rootDocument: document,
    rootType: types.DefinitionRoot,
    externalRefResolver,
  })

  const statVisitor: Oas3Visitor | Oas2Visitor = {
    ExternalDocs: { enter() { statsCount.externalDocs.total++; }},
    ref: { enter() { statsCount.refs.total++; }},
    Tag: { enter() { statsCount.tags.total++; }},
    Operation: { enter() { statsCount.operations.total++; }},
    PathItem: { enter(node: any) { statsCount.pathItems.total += Object.keys(node).length }},
    Link: { enter() { statsCount.links.total++; }},
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
  })

  printStatsTable(statsCount)
}
