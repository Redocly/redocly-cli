import {
  BaseResolver,
  detectSpec,
  getTypes,
  logger,
  normalizeTypes,
  resolveDocument,
  slash,
  type CollectFn,
  type Document,
  type NormalizedNodeType,
  type ResolvedRefMap,
  type SpecVersion,
  type WalkContext,
} from '@redocly/openapi-core';
import * as path from 'node:path';

import type { Entrypoint, VerifyConfigOptions } from '../../types.js';
import { exitWithError } from '../../utils/error.js';
import { getFallbackApisOrExit } from '../../utils/miscellaneous.js';
import type { CommandArgs } from '../../wrapper.js';
import { buildGraph } from './build-graph.js';
import { buildStructure } from './build-structure.js';
import { filterAffected } from './filter-affected.js';
import { matchAffectedBy } from './match-affected-by.js';
import { renderJson } from './print/json.js';
import { renderMermaid } from './print/mermaid.js';
import { renderStylish, type StylishOptions } from './print/stylish.js';
import type { DependencyGraph, TreeFormat } from './types.js';

export type TreeArgv = {
  apis?: string[];
  format: TreeFormat;
  'affected-by'?: string[];
  files?: boolean;
} & VerifyConfigOptions;

type TreeModeContext = {
  argv: TreeArgv;
  config: CommandArgs<TreeArgv>['config'];
  collectSpecData: CommandArgs<TreeArgv>['collectSpecData'];
  externalRefResolver: BaseResolver;
  cwd: string;
};

export async function handleTree({ argv, config, collectSpecData }: CommandArgs<TreeArgv>) {
  const apis = await getFallbackApisOrExit(argv.apis, config);
  const externalRefResolver = new BaseResolver(config.resolve);
  const cwd = process.cwd();

  if (argv.files) {
    return handleFilesMode({ apis, argv, config, collectSpecData, externalRefResolver, cwd });
  }

  if (apis.length > 1) {
    return exitWithError(
      'The tree command shows the structure of one API description at a time. Pass a single API, or use --files for the multi-API file-level graph.'
    );
  }

  return handleStructureMode({
    api: apis[0],
    argv,
    config,
    collectSpecData,
    externalRefResolver,
    cwd,
  });
}

async function resolveApi({
  apiPath,
  config,
  collectSpecData,
  externalRefResolver,
}: {
  apiPath: string;
  config: CommandArgs<TreeArgv>['config'];
  collectSpecData?: CollectFn;
  externalRefResolver: BaseResolver;
}): Promise<{
  rootDocument: Document;
  specVersion: SpecVersion;
  types: Record<string, NormalizedNodeType>;
  refMap: ResolvedRefMap;
}> {
  const rootDocument = await externalRefResolver.resolveDocument(null, apiPath, true);
  if (rootDocument instanceof Error) {
    return exitWithError(`Failed to load ${apiPath}: ${rootDocument.message}`);
  }
  collectSpecData?.(rootDocument.parsed);
  const specVersion = detectSpec(rootDocument.parsed);
  const types = normalizeTypes(config.extendTypes(getTypes(specVersion), specVersion), config);
  const refMap = await resolveDocument({
    rootDocument,
    rootType: types.Root,
    externalRefResolver,
  });
  return { rootDocument, specVersion, types, refMap };
}

async function handleFilesMode({
  apis,
  argv,
  config,
  collectSpecData,
  externalRefResolver,
  cwd,
}: TreeModeContext & { apis: Entrypoint[] }): Promise<void> {
  const resolutions: Array<{ rootDocument: Document; refMap: ResolvedRefMap }> = [];
  for (const { path: apiPath } of apis) {
    const { rootDocument, refMap } = await resolveApi({
      apiPath,
      config,
      collectSpecData,
      externalRefResolver,
    });
    resolutions.push({ rootDocument, refMap });
  }

  const graph = buildGraph(resolutions, {
    cwd,
    resolveRef: (base, uri) => externalRefResolver.resolveExternalRef(base, uri),
  });

  let printedGraph = graph;
  let stylishOptions: StylishOptions = {};
  if (argv['affected-by']) {
    const changedIds = argv['affected-by'].map((file) =>
      slash(path.relative(cwd, path.resolve(cwd, file)))
    );
    const knownIds = new Set(graph.nodes.map((node) => node.id));
    for (const id of changedIds) {
      if (!knownIds.has(id)) {
        logger.warn(`${id} is not referenced by any of the processed APIs.\n`);
      }
    }
    const knownChanged = changedIds.filter((id) => knownIds.has(id));
    printedGraph = filterAffected(graph, knownChanged);
    stylishOptions = {
      changed: knownChanged,
      summary: `${printedGraph.nodes.length} of ${graph.nodes.length} files affected · affected roots: ${
        printedGraph.roots.join(', ') || 'none'
      }`,
    };
  }

  renderOutput(printedGraph, argv.format, stylishOptions);
}

async function handleStructureMode({
  api,
  argv,
  config,
  collectSpecData,
  externalRefResolver,
  cwd,
}: TreeModeContext & { api: Entrypoint }): Promise<void> {
  const {
    rootDocument,
    specVersion,
    types,
    refMap: resolvedRefMap,
  } = await resolveApi({
    apiPath: api.path,
    config,
    collectSpecData,
    externalRefResolver,
  });

  const ctx: WalkContext = {
    problems: [],
    specVersion,
    config,
    visitorsData: {},
  };

  const graph = buildStructure({
    document: rootDocument,
    types,
    resolvedRefMap,
    ctx,
    cwd,
    resolveRef: (base, uri) => externalRefResolver.resolveExternalRef(base, uri),
  });

  const rootId = graph.roots[0];

  let printedGraph = graph;
  let stylishOptions: StylishOptions = {};

  if (argv['affected-by']) {
    const match = matchAffectedBy(graph, argv['affected-by'], { cwd, rootId });

    for (const note of match.notes) {
      logger.warn(note + '\n');
    }
    for (const warning of match.warnings) {
      logger.warn(warning + '\n');
    }

    printedGraph = filterAffected(graph, match.changedIds);

    const totalOperations = graph.nodes.filter((node) => node.kind === 'operation').length;
    const affectedOperations = printedGraph.nodes.filter(
      (node) => node.kind === 'operation'
    ).length;
    const affectedPaths = printedGraph.nodes
      .filter((node) => node.kind === 'path')
      .map((node) => node.id);
    const summary =
      totalOperations > 0
        ? `${affectedOperations} of ${totalOperations} operations affected · affected paths: ${affectedPaths.join(', ') || 'none'}`
        : `${printedGraph.nodes.length} of ${graph.nodes.length} nodes affected`;

    stylishOptions = {
      changed: match.markerIds,
      summary,
      emptyMessage: 'No nodes affected.',
    };
  }

  renderOutput(printedGraph, argv.format, stylishOptions);
}

function renderOutput(
  graph: DependencyGraph,
  format: TreeFormat,
  stylishOptions: StylishOptions
): void {
  switch (format) {
    case 'json':
      logger.output(renderJson(graph) + '\n');
      break;
    case 'mermaid':
      logger.output(renderMermaid(graph) + '\n');
      break;
    default:
      logger.output(renderStylish(graph, stylishOptions) + '\n');
  }
}
