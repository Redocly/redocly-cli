import {
  analyzeApi,
  appendDepsClosure,
  BaseResolver,
  buildApiIndex,
  buildNodeEnvelope,
  detectSpec,
  findIndexNode,
  getTypes,
  hasIndexLocation,
  logger,
  normalizeTypes,
  resolveDocument,
  slash,
  type CollectFn,
  type Document,
  type IndexGroupBy,
  type NormalizedNodeType,
  type ResolvedRefMap,
  type SpecVersion,
} from '@redocly/openapi-core';
import { writeFileSync } from 'node:fs';
import * as path from 'node:path';

import type { Entrypoint, VerifyConfigOptions } from '../../types.js';
import { exitWithError } from '../../utils/error.js';
import { getFallbackApisOrExit } from '../../utils/miscellaneous.js';
import type { CommandArgs } from '../../wrapper.js';
import { buildGraph } from './build-graph.js';
import { filterAffected, filterOperations, limitGraphLevel } from './filter-affected.js';
import { filterIndexByIds, filterIndexSections, limitIndexLevel } from './filter-index.js';
import { matchAffectedBy, wildcardToRegExp } from './match-affected-by.js';
import { commonDir } from './node-id.js';
import { renderDot } from './print/dot.js';
import { renderIndexJson } from './print/index-json.js';
import { renderJson } from './print/json.js';
import { renderMermaid } from './print/mermaid.js';
import { renderStylish, type StylishOptions } from './print/stylish.js';
import type { DependencyGraph, TreeFormat } from './types.js';

export type TreeArgv = {
  apis?: string[];
  format: TreeFormat;
  output?: string;
  level?: number;
  operations?: boolean;
  uses?: string[];
  files?: boolean;
  'group-by': IndexGroupBy;
  node?: string;
  'with-deps'?: boolean;
} & VerifyConfigOptions;

type TreeModeContext = {
  argv: TreeArgv;
  config: CommandArgs<TreeArgv>['config'];
  collectSpecData: CommandArgs<TreeArgv>['collectSpecData'];
  externalRefResolver: BaseResolver;
  cwd: string;
};

export async function handleTree({ argv, config, collectSpecData }: CommandArgs<TreeArgv>) {
  if (argv.level !== undefined && (!Number.isInteger(argv.level) || argv.level < 1)) {
    return exitWithError('The --level value must be a positive integer.');
  }

  const apis = await getFallbackApisOrExit(argv.apis, config);
  const externalRefResolver = new BaseResolver(config.resolve);
  const cwd = process.cwd();

  if (argv.files && argv.node !== undefined) {
    return exitWithError(
      'The --node option applies to the structure view and cannot be combined with --files.'
    );
  }

  if (argv.files) {
    if (argv.operations) {
      return exitWithError(
        'The --operations option applies to the structure view and cannot be combined with --files.'
      );
    }
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

async function loadApi({
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
}> {
  const rootDocument = await externalRefResolver.resolveDocument(null, apiPath, true);
  if (rootDocument instanceof Error) {
    return exitWithError(`Failed to load ${apiPath}: ${rootDocument.message}`);
  }
  collectSpecData?.(rootDocument.parsed);
  const specVersion = detectSpec(rootDocument.parsed);
  const types = normalizeTypes(config.extendTypes(getTypes(specVersion), specVersion), config);
  return { rootDocument, specVersion, types };
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
    const { rootDocument, types } = await loadApi({
      apiPath,
      config,
      collectSpecData,
      externalRefResolver,
    });
    const refMap = await resolveDocument({
      rootDocument,
      rootType: types.Root,
      externalRefResolver,
    });
    resolutions.push({ rootDocument, refMap });
  }

  const base = commonDir(
    resolutions.map(({ rootDocument }) => path.dirname(rootDocument.source.absoluteRef))
  );

  const graph = buildGraph(resolutions, {
    base,
    resolveRef: (refBase, uri) => externalRefResolver.resolveExternalRef(refBase, uri),
  });

  let printedGraph = graph;
  let stylishOptions: StylishOptions = {};
  if (argv['uses']) {
    const knownIds = new Set(graph.nodes.map((node) => node.id));
    // Match paths the way they are displayed — relative to the API root — and fall
    // back to paths relative to the current working directory. A `*`/`?` wildcard
    // matches the displayed file ids directly.
    const changedIds = argv['uses'].flatMap((file) => {
      if (/[*?]/.test(file)) {
        const matcher = wildcardToRegExp(file);
        const matches = graph.nodes.map((node) => node.id).filter((id) => matcher.test(id));
        if (matches.length === 0) {
          logger.warn(`${file} does not match any file of the processed APIs.\n`);
        }
        return matches;
      }
      const fromRoot = slash(path.relative(base, path.resolve(base, file)));
      if (knownIds.has(fromRoot)) return [fromRoot];
      const fromCwd = slash(path.relative(base, path.resolve(cwd, file)));
      return [knownIds.has(fromCwd) ? fromCwd : fromRoot];
    });
    for (const id of changedIds) {
      if (!knownIds.has(id)) {
        logger.warn(`${id} is not referenced by any of the processed APIs.\n`);
      }
    }
    const knownChanged = changedIds.filter((id) => knownIds.has(id));
    printedGraph = filterAffected(graph, knownChanged);
    stylishOptions = {
      summary: `${printedGraph.nodes.length} of ${graph.nodes.length} files affected · affected roots: ${
        printedGraph.roots.join(', ') || 'none'
      }`,
    };
  }

  renderOutput(printedGraph, argv, stylishOptions);
}

async function handleStructureMode({
  api,
  argv,
  config,
  collectSpecData,
  externalRefResolver,
  cwd,
}: TreeModeContext & { api: Entrypoint }): Promise<void> {
  const { rootDocument, specVersion, types } = await loadApi({
    apiPath: api.path,
    config,
    collectSpecData,
    externalRefResolver,
  });

  const analysis = await analyzeApi({
    rootDocument,
    specVersion,
    types,
    externalRefResolver,
    cwd,
    resolveRef: (base, uri) => externalRefResolver.resolveExternalRef(base, uri),
  });
  const graph = analysis.graph;

  for (const node of graph.nodes) {
    if (!node.resolved) {
      logger.warn(`Could not resolve ${node.id} — shown as unresolved (❌).\n`);
    }
  }

  const isOpenApi = specVersion.startsWith('oas');

  if (!isOpenApi && (argv.node !== undefined || argv['with-deps'])) {
    return exitWithError(
      'The --node, --with-deps, and --group-by options support OpenAPI descriptions only for now.'
    );
  }

  if (argv.node !== undefined) {
    const fullIndex = buildApiIndex(analysis, { specVersion, cwd, groupBy: argv['group-by'] });
    const indexNode = findIndexNode(fullIndex.structure, argv.node);
    if (!indexNode) {
      return exitWithError(
        `No index node matches "${argv.node}". Run \`redocly tree --format=json\` to list node ids.`
      );
    }
    if (indexNode.nodes !== undefined && indexNode.nodes.length > 0) {
      // The sub-index is shaped like a one-section top-level index, so --level applies as-is.
      const subIndex = { ...fullIndex, structure: [indexNode] };
      const limited = argv.level !== undefined ? limitIndexLevel(subIndex, argv.level) : subIndex;
      emitRendered(renderIndexJson(limited), argv);
      return;
    }
    if (!hasIndexLocation(indexNode)) {
      return exitWithError(
        `Node "${indexNode.id}" has no source location. Pick one of its child nodes.`
      );
    }
    let envelope = buildNodeEnvelope({ indexNode, analysis, cwd });
    if (argv['with-deps']) {
      envelope = appendDepsClosure({ envelope, indexNode, analysis, index: fullIndex, cwd });
    }
    emitRendered(JSON.stringify(envelope, null, 2), argv);
    return;
  }

  const index =
    argv.format === 'json' && isOpenApi
      ? buildApiIndex(analysis, { specVersion, cwd, groupBy: argv['group-by'] })
      : undefined;

  // Structure mode resolves exactly one API (handleTree rejects more), so there is a single root.
  const rootId = graph.roots[0];

  let printedGraph = graph;
  let stylishOptions: StylishOptions = {};

  if (argv['uses']) {
    const match = matchAffectedBy(graph, argv['uses'], { cwd, rootId });

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
      summary,
      emptyMessage: 'No nodes affected.',
    };
  }

  if (argv.operations) {
    printedGraph = filterOperations(printedGraph);
    stylishOptions = { ...stylishOptions, showOperationId: true };
  }

  if (index !== undefined) {
    let printedIndex = index;
    if (argv['uses']) {
      const keepIds = new Set(printedGraph.nodes.map((node) => node.id));
      printedIndex = filterIndexByIds(printedIndex, keepIds);
      if (index.structure.some((section) => section.id === 'Webhooks')) {
        logger.warn(
          'Webhooks are not part of the dependency graph yet, so they are omitted from --uses-filtered output.\n'
        );
      }
    }
    if (argv.operations) {
      printedIndex = filterIndexSections(printedIndex, ['Operations', 'Webhooks']);
    }
    if (argv.level !== undefined) {
      printedIndex = limitIndexLevel(printedIndex, argv.level);
    }
    emitRendered(renderIndexJson(printedIndex), argv);
    return;
  }

  renderOutput(printedGraph, argv, stylishOptions);
}

function renderOutput(
  graph: DependencyGraph,
  argv: TreeArgv,
  stylishOptions: StylishOptions
): void {
  let printedGraph = graph;
  if (argv.level !== undefined) {
    // The stylish view cuts by DISPLAY depth (matching `tree -L`); graph formats have no display
    // depth, so they keep the nodes within `level` steps of the root instead.
    if (argv.format === 'stylish') {
      stylishOptions = { ...stylishOptions, maxLevel: argv.level };
    } else {
      printedGraph = limitGraphLevel(printedGraph, argv.level);
    }
  }
  const rendered = renderGraph(printedGraph, argv.format, stylishOptions);
  emitRendered(rendered, argv);
}

function emitRendered(rendered: string, argv: TreeArgv): void {
  if (argv.output) {
    writeFileSync(argv.output, rendered + '\n');
    logger.info(`Tree written to ${argv.output}\n`);
    return;
  }
  logger.output(rendered + '\n');
}

function renderGraph(
  graph: DependencyGraph,
  format: TreeFormat,
  stylishOptions: StylishOptions
): string {
  switch (format) {
    case 'json':
      return renderJson(graph);
    case 'mermaid':
      return renderMermaid(graph);
    case 'dot':
      return renderDot(graph);
    default:
      return renderStylish(graph, stylishOptions);
  }
}
