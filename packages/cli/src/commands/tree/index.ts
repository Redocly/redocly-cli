import {
  analyzeApi,
  BaseResolver,
  buildComponentCard,
  buildComponentListing,
  buildOperationCard,
  buildOperationListing,
  buildOverview,
  buildPathListing,
  buildUsedByReport,
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
  toOperationListItem,
  type ApiAnalysis,
  type ApiOverview,
  type CollectFn,
  type CollectedOperation,
  type ComponentCard,
  type ComponentListItem,
  type Document,
  type NormalizedNodeType,
  type OperationCard,
  type OperationListItem,
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
import { filterAffected } from './filter-affected.js';
import { commonDir } from './node-id.js';
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
  tag?: string;
  path?: string;
  webhook?: string;
  operation?: string;
  component?: string;
  name?: string;
  'used-by'?: boolean;
  'with-deps'?: boolean;
} & VerifyConfigOptions;

export type TreeView =
  | { kind: 'overview'; overview: ApiOverview }
  | { kind: 'operations'; items: OperationListItem[]; scope?: string }
  | { kind: 'paths'; items: PathListItem[] }
  | { kind: 'components'; section: string; items: ComponentListItem[] }
  | { kind: 'operation-card'; card: OperationCard }
  | { kind: 'component-card'; card: ComponentCard }
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

  const finishOperation = (operation: CollectedOperation): TreeView =>
    usedBy
      ? { kind: 'used-by', report: buildUsedByReport(analysis, operation.id, cwd) }
      : {
          kind: 'operation-card',
          card: buildOperationCard(analysis, operation, { specVersion, cwd, withDeps }),
        };

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
    const scopeOperations =
      argv.webhook !== undefined
        ? listOperations(meta, { webhook: argv.webhook })
        : listOperations(meta, { path: argv.path });
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
      items: scopeOperations.map((operation) => toOperationListItem(operation, cwd)),
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

  if (argv.operations)
    return { kind: 'operations', items: buildOperationListing(analysis, { cwd }) };
  if (argv.paths) return { kind: 'paths', items: buildPathListing(analysis, { cwd }) };

  return { kind: 'overview', overview: buildOverview(analysis, { specVersion, cwd }) };
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

  renderOutput(graph, argv, {});
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
    argv.paths === true ||
    argv.operations === true ||
    argv['used-by'] === true ||
    argv['with-deps'] === true;

  if (!isOpenApi) {
    // Selectors need the OpenAPI-specific analysis; the plain {nodes, links} graph still
    // renders for any spec type, in both stylish and json.
    if (usesSelectors) {
      return exitWithError(
        'The tree selectors (--tag, --path, --operation, --webhook, --component, --name, --paths, --operations, --used-by, --with-deps) support OpenAPI descriptions only for now.'
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

  if (view.kind === 'used-by' && argv.format === 'stylish') {
    // Human impact view: reuse the graph filter + stylish tree.
    const printedGraph = filterAffected(graph, [view.report.target.id]);
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
