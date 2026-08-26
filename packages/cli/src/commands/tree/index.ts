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
  buildPointerCard,
  buildUsedByReport,
  collectConnectedIds,
  COMPONENT_SECTIONS,
  detectSpec,
  findComponent,
  findMatches,
  findOperationByOperationId,
  findOperationByPathMethod,
  findWebhookOperation,
  getTypes,
  graphNodeIdFor,
  HTTP_METHODS,
  listOperations,
  logger,
  normalizeComponentSection,
  normalizeTypes,
  resolveDocument,
  resolvePointerSelector,
  suggestNames,
  type ApiAnalysis,
  type ApiOverview,
  type CollectSpecData,
  type CollectedComponent,
  type CollectedOperation,
  type ComponentCard,
  type ComponentListCard,
  type Document,
  type FileCard,
  type FindReport,
  type NormalizedNodeType,
  type OperationCard,
  type OperationListCard,
  type PointerCard,
  type PointerResolution,
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
import { renderAiFileGraph } from './print/ai.js';
import { renderJson } from './print/json.js';
import { renderStylish, type StylishOptions } from './print/stylish.js';
import { renderView } from './print/views.js';
import type { DependencyGraph, TreeFormat } from './types.js';

export type TreeArgv = {
  apis?: string[];
  format: TreeFormat;
  output?: string;
  files?: boolean;
  operations?: boolean;
  webhooks?: boolean;
  tag?: string;
  path?: string;
  webhook?: string;
  operation?: string;
  find?: string;
  pointer?: string;
  component?: string;
  name?: string;
  file?: string;
  'used-by'?: boolean;
  'with-deps'?: boolean;
} & VerifyConfigOptions;

// PointerCard is a core type (see `buildPointerCard` in `@redocly/openapi-core`); re-exported here
// so the renderers under `print/` can keep importing every view-payload type from this one module.
export type { PointerCard };

export type TreeView =
  | {
      kind: 'overview';
      overview: ApiOverview;
      /** Populated only for the stylish and ai renders, which expand the tree down to operations. */
      operations?: OperationListCard[];
      webhookOperations?: OperationListCard[];
    }
  | { kind: 'operations'; items: OperationListCard[]; scope?: string }
  | { kind: 'tags'; items: ApiOverview['tags'] }
  | { kind: 'components'; section: string; items: ComponentListCard[] }
  | { kind: 'operation-card'; card: OperationCard }
  | { kind: 'component-card'; card: ComponentCard }
  | { kind: 'file-card'; card: FileCard }
  | { kind: 'pointer-card'; card: PointerCard }
  | { kind: 'used-by'; report: UsedByReport }
  | { kind: 'find'; report: FindReport };

export class TreeSelectorError extends Error {}

/** Above this operation count the default stylish tree collapses to tag counts with a --tag hint. */
export const OVERVIEW_EXPAND_LIMIT = 100;

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

/** The `--find` branch: a standalone search that cannot combine with any other selector. */
function resolveFindView(argv: TreeArgv, analysis: ApiAnalysis, cwd: string): TreeView {
  const otherSelector =
    argv.pointer !== undefined ||
    argv.tag !== undefined ||
    argv.path !== undefined ||
    argv.webhook !== undefined ||
    argv.operation !== undefined ||
    argv.component !== undefined ||
    argv.name !== undefined ||
    argv.file !== undefined ||
    argv.operations === true ||
    argv.webhooks === true ||
    argv['used-by'] === true ||
    argv['with-deps'] === true;
  if (otherSelector) {
    throw new TreeSelectorError(
      '--find is a standalone search and cannot be combined with other selectors.'
    );
  }
  const terms = argv.find!.trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    throw new TreeSelectorError('--find needs at least one word to search for.');
  }
  return { kind: 'find', report: findMatches(analysis, terms, { cwd }) };
}

/** The `--file` branch. */
function resolveFileView(argv: TreeArgv, analysis: ApiAnalysis, cwd: string): TreeView {
  if (argv['with-deps'] === true) {
    throw new TreeSelectorError('--with-deps requires an operation or component selection.');
  }
  const found = resolveFileSelector(argv.file!, analysis, cwd);
  if (!found) {
    selectorHint('file', argv.file!, knownFileIds(analysis), 'redocly tree <api> --files');
  }
  if (argv['used-by'] === true) {
    return { kind: 'used-by', report: buildFileUsedByReport(analysis, found.filePath, cwd) };
  }
  return { kind: 'file-card', card: found.card };
}

/** The component card / used-by report split, shared by `--component --name` and an indexed `--pointer`. */
function finishComponent(
  component: CollectedComponent,
  argv: TreeArgv,
  analysis: ApiAnalysis,
  specVersion: SpecVersion,
  cwd: string
): TreeView {
  if (argv['used-by'] === true) {
    return {
      kind: 'used-by',
      report: buildUsedByReport(analysis, `${component.section}/${component.name}`, cwd),
    };
  }
  return {
    kind: 'component-card',
    card: buildComponentCard(analysis, component, {
      specVersion,
      cwd,
      withDeps: argv['with-deps'] === true,
      withContent: argv.format === 'ai',
    }),
  };
}

/** The `--component` (and `--name`) branch. */
function resolveComponentView(
  argv: TreeArgv,
  analysis: ApiAnalysis,
  cwd: string,
  specVersion: SpecVersion
): TreeView {
  const meta = analysis.meta;
  const section = normalizeComponentSection(argv.component!);
  if (section === undefined) {
    throw new TreeSelectorError(
      `Unknown component section "${argv.component}". Sections: ${COMPONENT_SECTIONS.join(', ')}.`
    );
  }
  if (argv.name === undefined) {
    if (argv['used-by'] === true || argv['with-deps'] === true) {
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
  return finishComponent(component, argv, analysis, specVersion, cwd);
}

/**
 * The `--path`/`--webhook` branch, including its nested `--operation` sub-branch.
 * `finishOperation` is the same closure `resolveTreeView` hands to `resolveOperationIdView`.
 */
function resolvePathScopeView(
  argv: TreeArgv,
  analysis: ApiAnalysis,
  cwd: string,
  finishOperation: (operation: CollectedOperation) => TreeView
): TreeView {
  const meta = analysis.meta;
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
      const didYouMean = suggestions.length > 0 ? ` Did you mean: ${suggestions.join(', ')}?` : '';
      throw new TreeSelectorError(`No webhook "${argv.webhook}".${didYouMean}`);
    }
    const knownPaths = [
      ...new Set(
        meta.operations
          .filter((operation) => !operation.isWebhook)
          .map((operation) => operation.containerKey)
      ),
    ];
    const suggestions = suggestNames(argv.path!, knownPaths);
    const didYouMean = suggestions.length > 0 ? ` Did you mean: ${suggestions.join(', ')}?` : '';
    throw new TreeSelectorError(
      `No path "${argv.path}".${didYouMean} Run \`redocly tree <api> --operations\` to list operations.`
    );
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
  if (argv['with-deps'] === true) {
    throw new TreeSelectorError('--with-deps requires --operation (or --component with --name).');
  }
  if (argv['used-by'] === true) {
    // A path's used-by is the used-by of its path node; keep v1 simple: require an operation.
    throw new TreeSelectorError('--used-by requires --operation, or --component with --name.');
  }
  return {
    kind: 'operations',
    scope: argv.webhook ?? argv.path,
    items: buildOperationListing(analysis, { cwd, ...scope }),
  };
}

/** The bare `--operation` (operationId) branch. */
function resolveOperationIdView(
  argv: TreeArgv,
  analysis: ApiAnalysis,
  finishOperation: (operation: CollectedOperation) => TreeView
): TreeView {
  const meta = analysis.meta;
  if (argv.tag !== undefined) {
    throw new TreeSelectorError(
      '--operation with an operationId selects one operation; combining it with --tag is ambiguous. Drop --tag, or use --tag alone to list its operations.'
    );
  }
  if (HTTP_METHODS.has(argv.operation!.toLowerCase())) {
    throw new TreeSelectorError(
      `"${argv.operation}" looks like an HTTP method. Add --path (or --webhook) to select the operation, or pass an operationId.`
    );
  }
  const operation = findOperationByOperationId(meta, argv.operation!);
  if (!operation) {
    selectorHint(
      'operation',
      argv.operation!,
      meta.operations
        .map((candidate) => candidate.operationId)
        .filter((operationId): operationId is string => operationId !== undefined),
      'redocly tree <api> --operations'
    );
  }
  return finishOperation(operation);
}

/** The `--tag` branch: one tag's operations, or, with no name given, the list of tags. */
function resolveTagView(
  argv: TreeArgv,
  analysis: ApiAnalysis,
  specVersion: SpecVersion,
  cwd: string
): TreeView {
  const meta = analysis.meta;
  if (argv['used-by'] === true || argv['with-deps'] === true) {
    throw new TreeSelectorError('--used-by and --with-deps need a single operation or component.');
  }
  if (argv.tag === '') {
    return { kind: 'tags', items: buildOverview(analysis, { specVersion, cwd }).tags };
  }
  const items = buildOperationListing(analysis, { cwd, tag: argv.tag });
  if (items.length === 0) {
    selectorHint(
      'tag',
      argv.tag!,
      [...new Set(meta.operations.flatMap((operation) => operation.tags))],
      'redocly tree <api>'
    );
  }
  return { kind: 'operations', scope: argv.tag, items };
}

/**
 * The overview view, shared by the bare invocation (bottom of `resolveTreeView`) and a `--pointer`
 * that lands on the document root (`#/`): same expand-to-operations rule either way.
 */
function buildOverviewView(
  argv: TreeArgv,
  analysis: ApiAnalysis,
  specVersion: SpecVersion,
  cwd: string
): TreeView {
  const overview = buildOverview(analysis, { specVersion, cwd });
  if (argv.format === 'json') return { kind: 'overview', overview };
  // Past this many operations the expanded default tree stops being readable (and building a
  // card per operation stops being cheap), so the overview collapses to tag counts and the
  // renderer appends a --tag hint instead.
  if (overview.operations > OVERVIEW_EXPAND_LIMIT) return { kind: 'overview', overview };
  // The overview itself carries no per-operation detail; the stylish and ai renderers both
  // expand it down to operations (see renderOverview / renderAiOverview), so build the same
  // listings --operations/--webhooks return and hand them to the view alongside it. json is
  // unaffected: viewPayload only ever serializes `view.overview` for this view kind, so these
  // extra fields never reach that output.
  return {
    kind: 'overview',
    overview,
    operations: buildOperationListing(analysis, { cwd }),
    webhookOperations: buildOperationListing(analysis, { cwd, allWebhooks: true }),
  };
}

/**
 * A `--pointer` that lands exactly on a container boundary (the document root, `paths`,
 * `webhooks`, `components`, one component section, or one path) routes to the same bounded view
 * its typed selector equivalent already builds, instead of the pointer-card path below.
 */
function resolveContainerPointerView(
  resolution: Exclude<
    PointerResolution,
    { kind: 'component' | 'operation' | 'deep' | 'unresolved' }
  >,
  argv: TreeArgv,
  analysis: ApiAnalysis,
  specVersion: SpecVersion,
  cwd: string
): TreeView {
  switch (resolution.kind) {
    case 'overview':
      return buildOverviewView(argv, analysis, specVersion, cwd);
    case 'all-operations':
      return { kind: 'operations', items: buildOperationListing(analysis, { cwd }) };
    case 'all-webhooks':
      return {
        kind: 'operations',
        items: buildOperationListing(analysis, { cwd, allWebhooks: true }),
      };
    case 'components-root':
      throw new TreeSelectorError(
        `Point one level deeper: --pointer='#/components/<section>'. Sections: ${COMPONENT_SECTIONS.join(', ')}.`
      );
    case 'component-section':
      return {
        kind: 'components',
        section: resolution.section,
        items: buildComponentListing(analysis, { cwd, section: resolution.section }),
      };
    case 'path-operations':
      return {
        kind: 'operations',
        scope: resolution.path,
        items: buildOperationListing(analysis, { cwd, path: resolution.path }),
      };
    case 'webhook-operations':
      return {
        kind: 'operations',
        scope: resolution.webhook,
        items: buildOperationListing(analysis, { cwd, webhook: resolution.webhook }),
      };
  }
}

/**
 * The `--pointer` branch: a standalone selector, same rule as `--find` (mirrors its guard list —
 * `--find` is checked first in `resolveTreeView` and returns early, so it can never still be set
 * here). Unlike `--find`, `--used-by`/`--with-deps` aren't in the conflict list here — they're
 * valid modifiers once the pointer resolves to an indexed node, and get their own error otherwise,
 * below.
 */
function resolvePointerView(
  argv: TreeArgv,
  analysis: ApiAnalysis,
  specVersion: SpecVersion,
  cwd: string,
  finishOperation: (operation: CollectedOperation) => TreeView
): TreeView {
  const otherSelector =
    argv.tag !== undefined ||
    argv.path !== undefined ||
    argv.webhook !== undefined ||
    argv.operation !== undefined ||
    argv.component !== undefined ||
    argv.name !== undefined ||
    argv.file !== undefined ||
    argv.operations === true ||
    argv.webhooks === true;
  if (otherSelector) {
    throw new TreeSelectorError(
      '--pointer is a standalone selector and cannot be combined with other selectors.'
    );
  }

  const resolution = resolvePointerSelector(analysis, argv.pointer!, { cwd });

  if (resolution.kind === 'component') {
    return finishComponent(resolution.component, argv, analysis, specVersion, cwd);
  }
  if (resolution.kind === 'operation') {
    return finishOperation(resolution.operation);
  }
  if (resolution.kind === 'unresolved') {
    const nearest = resolution.nearestResolvable
      ? ` Nearest resolvable: ${resolution.nearestResolvable}.`
      : '';
    throw new TreeSelectorError(`Nothing at "${resolution.pointer}".${nearest}`);
  }

  if (resolution.kind === 'deep') {
    if (argv['used-by'] === true || argv['with-deps'] === true) {
      const message = resolution.ancestor
        ? `--used-by and --with-deps need an indexed node. Nearest: --pointer='${resolution.ancestor.pointer}'`
        : '--used-by and --with-deps need an indexed node. This pointer has no indexed ancestor.';
      throw new TreeSelectorError(message);
    }
    return { kind: 'pointer-card', card: buildPointerCard(resolution) };
  }

  // Every remaining kind is a bounded listing or the overview, not a single node — the same rule
  // a listing selector applies (--operations, --webhooks, --component without --name).
  if (argv['used-by'] === true || argv['with-deps'] === true) {
    throw new TreeSelectorError(
      '--used-by and --with-deps need an indexed component or operation, not a listing. Point --pointer at a specific path/method, webhook/method, or component name.'
    );
  }
  return resolveContainerPointerView(resolution, argv, analysis, specVersion, cwd);
}

export function resolveTreeView(
  argv: TreeArgv,
  analysis: ApiAnalysis,
  specVersion: SpecVersion,
  cwd: string
): TreeView {
  const usedBy = argv['used-by'] === true;
  const withDeps = argv['with-deps'] === true;

  if (usedBy && withDeps) {
    throw new TreeSelectorError(
      '--used-by and --with-deps cannot be combined: --used-by returns the operations and components that reference the selection, --with-deps returns the selection with its dependency closure.'
    );
  }

  if (argv.find !== undefined) {
    return resolveFindView(argv, analysis, cwd);
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
      ? {
          kind: 'used-by',
          // Every method under a webhook shares one container node (see graphNodeIdFor); the
          // operation's own id isn't a graph node, so reverse edges must be counted against the
          // container instead.
          report: buildUsedByReport(analysis, graphNodeIdFor(operation), cwd),
        }
      : {
          kind: 'operation-card',
          card: buildOperationCard(analysis, operation, {
            specVersion,
            cwd,
            withDeps,
            withContent: argv.format === 'ai',
          }),
        };

  if (argv.pointer !== undefined) {
    return resolvePointerView(argv, analysis, specVersion, cwd, finishOperation);
  }

  if (argv.file !== undefined) {
    return resolveFileView(argv, analysis, cwd);
  }

  if (argv.component !== undefined) {
    return resolveComponentView(argv, analysis, cwd, specVersion);
  }

  if (argv.name !== undefined) throw new TreeSelectorError('--name requires --component.');

  if (argv.path !== undefined || argv.webhook !== undefined) {
    return resolvePathScopeView(argv, analysis, cwd, finishOperation);
  }

  if (argv.operation !== undefined) {
    return resolveOperationIdView(argv, analysis, finishOperation);
  }

  if (argv.tag !== undefined) {
    return resolveTagView(argv, analysis, specVersion, cwd);
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

  return buildOverviewView(argv, analysis, specVersion, cwd);
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

export async function loadApi({
  apiPath,
  config,
  collectSpecData,
  externalRefResolver,
}: {
  apiPath: string;
  config: CommandArgs<TreeArgv>['config'];
  collectSpecData?: CollectSpecData;
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
    argv.find !== undefined ||
    argv.pointer !== undefined ||
    argv.operations === true ||
    argv.webhooks === true ||
    argv['used-by'] === true ||
    argv['with-deps'] === true;

  if (!isOpenApi) {
    // Selectors need the OpenAPI-specific analysis; the plain {nodes, links} graph still
    // renders for any spec type, in both stylish and json.
    if (usesSelectors) {
      return exitWithError(
        'The tree selectors (--tag, --path, --operation, --webhook, --component, --name, --file, --find, --pointer, --operations, --webhooks, --used-by, --with-deps) support OpenAPI descriptions only for now.'
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
  if (format === 'stylish') return renderStylish(graph, stylishOptions);
  if (format === 'ai') return renderAiFileGraph(graph);
  return renderJson(graph);
}
