import {
  BaseResolver,
  detectSpec,
  getTypes,
  logger,
  normalizeTypes,
  resolveDocument,
  slash,
  type Document,
  type ResolvedRefMap,
} from '@redocly/openapi-core';
import * as path from 'node:path';

import type { VerifyConfigOptions } from '../../types.js';
import { exitWithError } from '../../utils/error.js';
import { getFallbackApisOrExit } from '../../utils/miscellaneous.js';
import type { CommandArgs } from '../../wrapper.js';
import { buildGraph } from './build-graph.js';
import { filterAffected } from './filter-affected.js';
import { renderJson } from './print/json.js';
import { renderMermaid } from './print/mermaid.js';
import { renderStylish, type StylishOptions } from './print/stylish.js';
import type { GraphFormat } from './types.js';

export type GraphArgv = {
  apis?: string[];
  format: GraphFormat;
  'affected-by'?: string[];
} & VerifyConfigOptions;

/** Resolves the given API descriptions and prints their file-level $ref dependency graph. */
export async function handleGraph({ argv, config, collectSpecData }: CommandArgs<GraphArgv>) {
  const apis = await getFallbackApisOrExit(argv.apis, config);
  const externalRefResolver = new BaseResolver(config.resolve);
  const cwd = process.cwd();

  const resolutions: Array<{ rootDocument: Document; refMap: ResolvedRefMap }> = [];
  for (const { path: apiPath } of apis) {
    const rootDocument = await externalRefResolver.resolveDocument(null, apiPath, true);
    if (rootDocument instanceof Error) {
      return exitWithError(`Failed to load ${apiPath}: ${rootDocument.message}`);
    }
    collectSpecData?.(rootDocument.parsed);
    const specVersion = detectSpec(rootDocument.parsed);
    const types = normalizeTypes(config.extendTypes(getTypes(specVersion), specVersion), config);
    const refMap = await resolveDocument({
      rootDocument: rootDocument,
      rootType: types.Root,
      externalRefResolver,
    });
    resolutions.push({ rootDocument: rootDocument, refMap });
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
    stylishOptions = { changed: knownChanged, totalNodeCount: graph.nodes.length };
  }

  switch (argv.format) {
    case 'json':
      logger.output(renderJson(printedGraph) + '\n');
      break;
    case 'mermaid':
      logger.output(renderMermaid(printedGraph) + '\n');
      break;
    default:
      logger.output(renderStylish(printedGraph, stylishOptions) + '\n');
  }
}
