import {
  analyzeApi,
  BaseResolver,
  buildComponentCard,
  buildComponentListing,
  buildFileCard,
  buildFileUsedByReport,
  buildOperationCard,
  buildOperationListing,
  buildOverview,
  buildPathListing,
  buildUsedByReport,
  collectConnectedIds,
  COMPONENT_SECTIONS,
  detectSpec,
  findComponent,
  findOperationByOperationId,
  findOperationByPathMethod,
  findWebhookOperation,
  getTypes,
  HTTP_METHODS,
  listOperations,
  logger,
  normalizeComponentSection,
  normalizeTypes,
  resolveDocument,
  suggestNames,
  type ApiAnalysis,
  type ApiOverview,
  type CollectFn,
  type CollectedOperation,
  type ComponentCard,
  type ComponentListCard,
  type Document,
  type FileCard,
  type NormalizedNodeType,
  type OperationCard,
  type OperationListCard,
  type PathListItem,
  type ResolvedRefMap,
  type SpecVersion,
  type UsedByReport,
} from '@redocly/openapi-core';
import { writeFileSync } from 'node:fs';
import * as path from 'node:path';

import type { Entrypoint, VerifyConfigOptions } from '../../types.js';
import { exitWithError } from '../../utils/error.js';
import { getFallbackApisOrExit } from '../../utils/miscellaneous.js';
import type { CommandArgs } from '../../wrapper.js';
import { buildGraph } from './build-graph.js';
import { commonDir, toNodeId } from './node-id.js';
import { renderJson } from './print/json.js';
import { renderStylish, type StylishOptions } from './print/stylish.js';
import { renderView } from './print/views.js';
import type { DependencyGraph, TreeFormat } from './types.js';

export type TreeArgv = {
  apis?: string[];
  format: TreeFormat;
  output?: string;
  files?: boolean;
  paths?: boolean;
  operations?: boolean;
  webhooks?: boolean;
  tag?: string;
  path?: string;
  webhook?: string;
  operation?: string;
  component?: string;
  name?: string;
  file?: string;
  'used-by'?: boolean;
  'with-deps'?: boolean;
} & VerifyConfigOptions;

export type TreeView =
  | {
      kind: 'overview';
      overview: ApiOverview;
      /** Populated only for the stylish render, which expands the tree down to operations. */
      operations?: OperationListCard[];
      webhookOperations?: OperationListCard[];
    }
  | { kind: 'operations'; items: OperationListCard[]; scope?: string }
  | { kind: 'paths'; items: PathListItem[] }
  | { kind: 'components'; section: string; items: ComponentListCard[] }
  | { kind: 'operation-card'; card: OperationCard }
  | { kind: 'component-card'; card: ComponentCard }
  | { kind: 'file-card'; card: FileCard }
  | { kind: 'used-by'; report: UsedByReport };

export class TreeSelectorError extends Error {}

function selectorHint(
  kind: string,
  input: string,
  candidates: string[],
  listCommand: string
): never {
  const suggestions = suggestNames(input, candidates);
  const didYouMean = suggestions.length > 0 ? ` Did you mean: ${suggestions.join(', ')}?` : '';
  throw new TreeSelectorError(
    `No ${kind} "${input}".${didYouMean} Run \`${listCommand}\` to list ${kind}s.`
  );
}

/**
 * A `--file` value is normalized like a node id: relative to one of `rootDirs` (an API's own
 * directory, where a multi-file description's sibling files are naturally addressed from) first,
 * falling back to plain cwd-relative. Both candidates collapse to the same id when `cwd` is
 * already the API's directory, the common case.
 */
function fileArgCandidates(
  input: string,
  rootDirs: string[],
  cwd: string,
  idBase: string
): string[] {
  const bases = [...new Set([...rootDirs, cwd])];
  return [...new Set(bases.map((base) => toNodeId(path.resolve(base, input), idBase)))];
}

function resolveFileSelector(
  input: string,
  analysis: ApiAnalysis,
  cwd: string
): { filePath: string; card: FileCard } | undefined {
  const rootDir = path.dirname(analysis.rootDocument.source.absoluteRef);
  for (const candidate of fileArgCandidates(input, [rootDir], cwd, cwd)) {
    const card = buildFileCard(analysis, candidate, { cwd });
    if (card) return { filePath: candidate, card };
  }
  return undefined;
}

function knownFileIds(analysis: ApiAnalysis): string[] {
  return [
    ...new Set(
      analysis.graph.nodes
        .map((node) => node.file)
        .filter((file): file is string => file !== undefined)
    ),
  ];
}

export function resolveTreeView(
  argv: TreeArgv,
  analysis: ApiAnalysis,
  specVersion: SpecVersion,
  cwd: string
): TreeView {
  const meta = analysis.meta;
  const usedBy = argv['used-by'] === true;
  const withDeps = argv['with-deps'] === true;

  if (usedBy && withDeps) {
    throw new TreeSelectorError(
      '--used-by and --with-deps cannot be combined: --used-by returns the operations and components that reference the selection, --with-deps returns the selection with its dependency closure.'
    );
  }

  if (
    argv.webhooks === true &&
    (argv.tag !== undefined ||
      argv.path !== undefined ||
      argv.operation !== undefined ||
      argv.component !== undefined ||
      argv.name !== undefined)
  ) {
    throw new TreeSelectorError(
      '--webhooks lists every webhook operation and cannot be combined with other selectors.'
    );
  }

  const finishOperation = (operation: CollectedOperation): TreeView =>
    usedBy
      ? { kind: 'used-by', report: buildUsedByReport(analysis, operation.id, cwd) }
      : {
          kind: 'operation-card',
          card: buildOperationCard(analysis, operation, { specVersion, cwd, withDeps }),
        };

  if (argv.file !== undefined) {
    if (withDeps) {
      throw new TreeSelectorError('--with-deps requires an operation or component selection.');
    }
    const found = resolveFileSelector(argv.file, analysis, cwd);
    if (!found) {
      selectorHint('file', argv.file, knownFileIds(analysis), 'redocly tree <api> --files');
    }
    if (usedBy) {
      return { kind: 'used-by', report: buildFileUsedByReport(analysis, found.filePath, cwd) };
    }
    return { kind: 'file-card', card: found.card };
  }

  if (argv.component !== undefined) {
    const section = normalizeComponentSection(argv.component);
    if (section === undefined) {
      throw new TreeSelectorError(
        `Unknown component section "${argv.component}". Sections: ${COMPONENT_SECTIONS.join(', ')}.`
      );
    }
    if (argv.name === undefined) {
      if (usedBy || withDeps) {
        throw new TreeSelectorError('Add --name to use --used-by or --with-deps with --component.');
      }
      return {
        kind: 'components',
        section,
        items: buildComponentListing(analysis, { cwd, section }),
      };
    }
    const component = findComponent(meta, section, argv.name);
    if (!component) {
      selectorHint(
        'component',
        argv.name,
        meta.components
          .filter((candidate) => candidate.section === section)
          .map((candidate) => candidate.name),
        `redocly tree <api> --component=${section}`
      );
    }
    if (usedBy) {
      return {
        kind: 'used-by',
        report: buildUsedByReport(analysis, `${section}/${component.name}`, cwd),
      };
    }
    return {
      kind: 'component-card',
      card: buildComponentCard(analysis, component, { specVersion, cwd, withDeps }),
    };
  }

  if (argv.name !== undefined) throw new TreeSelectorError('--name requires --component.');

  if (argv.path !== undefined || argv.webhook !== undefined) {
    const scope = argv.webhook !== undefined ? { webhook: argv.webhook } : { path: argv.path };
    const scopeOperations = listOperations(meta, scope);
    if (scopeOperations.length === 0) {
      if (argv.webhook !== undefined) {
        const knownWebhookKeys = [
          ...new Set(
            meta.operations
              .filter((operation) => operation.isWebhook)
              .map((operation) => operation.containerKey)
          ),
        ];
        const suggestions = suggestNames(argv.webhook, knownWebhookKeys);
        const didYouMean =
          suggestions.length > 0 ? ` Did you mean: ${suggestions.join(', ')}?` : '';
        throw new TreeSelectorError(`No webhook "${argv.webhook}".${didYouMean}`);
      }
      const knownPaths = [
        ...new Set(
          meta.operations
            .filter((operation) => !operation.isWebhook)
            .map((operation) => operation.containerKey)
        ),
      ];
      selectorHint('path', argv.path!, knownPaths, 'redocly tree <api> --paths');
    }
    if (argv.operation !== undefined) {
      const operation =
        argv.webhook !== undefined
          ? findWebhookOperation(meta, argv.webhook, argv.operation)
          : findOperationByPathMethod(meta, argv.path!, argv.operation);
      if (!operation) {
        throw new TreeSelectorError(
          `No ${argv.operation.toUpperCase()} operation on "${argv.webhook ?? argv.path}". Available: ${scopeOperations
            .map((candidate) => candidate.method)
            .join(', ')}.`
        );
      }
      return finishOperation(operation);
    }
    if (withDeps) {
      throw new TreeSelectorError('--with-deps requires --operation (or --component with --name).');
    }
    if (usedBy) {
      // A path's used-by is the used-by of its path node; keep v1 simple: require an operation.
      throw new TreeSelectorError('--used-by requires --operation, or --component with --name.');
    }
    return {
      kind: 'operations',
      scope: argv.webhook ?? argv.path,
      items: buildOperationListing(analysis, { cwd, ...scope }),
    };
  }

  if (argv.operation !== undefined) {
    if (argv.tag !== undefined) {
      throw new TreeSelectorError(
        '--operation with an operationId selects one operation; combining it with --tag is ambiguous. Drop --tag, or use --tag alone to list its operations.'
      );
    }
    if (HTTP_METHODS.has(argv.operation.toLowerCase())) {
      throw new TreeSelectorError(
        `"${argv.operation}" looks like an HTTP method. Add --path (or --webhook) to select the operation, or pass an operationId.`
      );
    }
    const operation = findOperationByOperationId(meta, argv.operation);
    if (!operation) {
      selectorHint(
        'operation',
        argv.operation,
        meta.operations
          .map((candidate) => candidate.operationId)
          .filter((operationId): operationId is string => operationId !== undefined),
        'redocly tree <api> --operations'
      );
    }
    return finishOperation(operation);
  }

  if (argv.tag !== undefined) {
    const items = buildOperationListing(analysis, { cwd, tag: argv.tag });
    if (items.length === 0) {
      selectorHint(
        'tag',
        argv.tag,
        [...new Set(meta.operations.flatMap((operation) => operation.tags))],
        'redocly tree <api>'
      );
    }
    if (usedBy || withDeps) {
      throw new TreeSelectorError(
        '--used-by and --with-deps need a single operation or component.'
      );
    }
    return { kind: 'operations', scope: argv.tag, items };
  }

  if (withDeps)
    throw new TreeSelectorError('--with-deps requires an operation or component selection.');
  if (usedBy)
    throw new TreeSelectorError('--used-by requires an operation or component selection.');

  if (argv.webhooks)
    return {
      kind: 'operations',
      items: buildOperationListing(analysis, { cwd, allWebhooks: true }),
    };
  if (argv.operations)
    return { kind: 'operations', items: buildOperationListing(analysis, { cwd }) };
  if (argv.paths) return { kind: 'paths', items: buildPathListing(analysis, { cwd }) };

  const overview = buildOverview(analysis, { specVersion, cwd });
  if (argv.format !== 'stylish') return { kind: 'overview', overview };
  // The overview itself carries no per-operation detail; the stylish tree renders down to
  // operations (see renderOverview), so build the same listings --operations/--webhooks return
  // and hand them to the view alongside it. json is unaffected: viewPayload only ever serializes
  // `view.overview` for this view kind, so these extra fields never reach that output.
  return {
    kind: 'overview',
    overview,
    operations: buildOperationListing(analysis, { cwd }),
    webhookOperations: buildOperationListing(analysis, { cwd, allWebhooks: true }),
  };
}

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
  collectSpecData?.(rootDocument);
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

  const rootDirs = resolutions.map(({ rootDocument }) =>
    path.dirname(rootDocument.source.absoluteRef)
  );
  const base = commonDir(rootDirs);

  const graph = buildGraph(resolutions, {
    base,
    resolveRef: (refBase, uri) => externalRefResolver.resolveExternalRef(refBase, uri),
  });

  if (argv.file === undefined) {
    renderOutput(graph, argv, {});
    return;
  }

  const knownIds = new Set(graph.nodes.map((node) => node.id));
  const fileId = fileArgCandidates(argv.file, rootDirs, cwd, base).find((candidate) =>
    knownIds.has(candidate)
  );
  if (fileId === undefined) {
    const suggestions = suggestNames(argv.file, [...knownIds]);
    const didYouMean = suggestions.length > 0 ? ` Did you mean: ${suggestions.join(', ')}?` : '';
    return exitWithError(
      `No file "${argv.file}".${didYouMean} Run \`redocly tree <apis...> --files\` to list files.`
    );
  }

  const connectedIds = new Set([
    ...collectConnectedIds([fileId], graph.edges),
    ...collectConnectedIds([fileId], graph.edges, { reverse: true }),
  ]);
  const filteredGraph: DependencyGraph = {
    roots: graph.roots.filter((root) => connectedIds.has(root)),
    nodes: graph.nodes.filter((node) => connectedIds.has(node.id)),
    edges: graph.edges.filter((edge) => connectedIds.has(edge.from) && connectedIds.has(edge.to)),
  };
  renderOutput(filteredGraph, argv, {});
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
  const usesSelectors =
    argv.tag !== undefined ||
    argv.path !== undefined ||
    argv.webhook !== undefined ||
    argv.operation !== undefined ||
    argv.component !== undefined ||
    argv.name !== undefined ||
    argv.file !== undefined ||
    argv.paths === true ||
    argv.operations === true ||
    argv.webhooks === true ||
    argv['used-by'] === true ||
    argv['with-deps'] === true;

  if (!isOpenApi) {
    // Selectors need the OpenAPI-specific analysis; the plain {nodes, links} graph still
    // renders for any spec type, in both stylish and json.
    if (usesSelectors) {
      return exitWithError(
        'The tree selectors (--tag, --path, --operation, --webhook, --component, --name, --file, --paths, --operations, --webhooks, --used-by, --with-deps) support OpenAPI descriptions only for now.'
      );
    }
    renderOutput(graph, argv, {});
    return;
  }

  let view: TreeView;
  try {
    view = resolveTreeView(argv, analysis, specVersion, cwd);
  } catch (error) {
    if (error instanceof TreeSelectorError) return exitWithError(error.message);
    throw error;
  }

  const target = view.kind === 'used-by' ? view.report.target : undefined;
  // A single operation/component target is one real graph node, so its reverse closure can be
  // seeded straight from `target.id` and rendered as the full dependency tree. A --file target
  // has no graph node of its own (buildFileUsedByReport seeds from every node the file defines,
  // see there) and always renders through the report-shaped view below instead.
  const isSingleNodeTarget =
    target !== undefined &&
    (target.method !== undefined || target.component !== undefined || target.webhook !== undefined);

  if (view.kind === 'used-by' && argv.format === 'stylish' && isSingleNodeTarget) {
    // Human impact view: the target's reverse closure — everything that transitively
    // references it, not what it references — rendered with the stylish tree.
    const affectedIds = collectConnectedIds([view.report.target.id], graph.edges, {
      reverse: true,
    });
    const printedGraph: DependencyGraph = {
      roots: graph.roots.filter((root) => affectedIds.has(root)),
      nodes: graph.nodes.filter((node) => affectedIds.has(node.id)),
      edges: graph.edges.filter((edge) => affectedIds.has(edge.from) && affectedIds.has(edge.to)),
    };
    const totalOperations = graph.nodes.filter((node) => node.kind === 'operation').length;
    const affectedOperations = printedGraph.nodes.filter(
      (node) => node.kind === 'operation'
    ).length;
    renderOutput(printedGraph, argv, {
      summary: `${affectedOperations} of ${totalOperations} operations affected`,
      emptyMessage: 'No nodes affected.',
    });
    return;
  }

  emitRendered(renderView(view, argv.format), argv);
}

function renderOutput(
  graph: DependencyGraph,
  argv: TreeArgv,
  stylishOptions: StylishOptions
): void {
  const rendered = renderGraph(graph, argv.format, stylishOptions);
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
  return format === 'json' ? renderJson(graph) : renderStylish(graph, stylishOptions);
}
