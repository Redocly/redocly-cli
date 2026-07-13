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
} from '@redocly/openapi-core';
import { writeFileSync } from 'node:fs';
import * as path from 'node:path';

import type { Entrypoint, VerifyConfigOptions } from '../../types.js';
import { exitWithError } from '../../utils/error.js';
import { getFallbackApisOrExit } from '../../utils/miscellaneous.js';
import type { CommandArgs } from '../../wrapper.js';
import { buildGraph } from './build-graph.js';
import { buildStructureGraph } from './build-structure.js';
import { filterAffected, filterOperations, limitGraphLevel } from './filter-affected.js';
import { matchAffectedBy, wildcardToRegExp } from './match-affected-by.js';
import { commonDir } from './node-id.js';
import { renderDot } from './print/dot.js';
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

  const { graph, problems } = await buildStructureGraph({
    rootDocument,
    specVersion,
    types,
    config,
    externalRefResolver,
    cwd,
  });

  for (const problem of problems) {
    logger.warn(`${problem.message}\n`);
  }
  if (problems.some((problem) => problem.severity === 'error')) {
    return exitWithError(`Cannot display the tree: ${api.path} has bundling errors (see above).`);
  }

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
