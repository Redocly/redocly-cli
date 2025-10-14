import { BaseResolver, makeDocumentFromString } from './resolve.js';
import { walkDocument } from './walk.js';
import { detectSpec } from './detect-spec.js';
import { getTypes } from './oas-types.js';
import { NormalizedConfigTypes } from './types/redocly-yaml.js';
import { type Config } from './config/config.js';
import { configBundlerVisitor, pluginsCollectorVisitor } from './config/visitors.js';
import { CONFIG_BUNDLER_VISITOR_ID, PLUGINS_COLLECTOR_VISITOR_ID } from './config/constants.js';
import { bundleDocument } from './bundle/bundle-document.js';

import type { ConfigBundlerVisitorData, PluginsCollectorVisitorData } from './config/visitors.js';
import type { Plugin, ResolvedConfig } from './config/types.js';
import type { NormalizedNodeType } from './types/index.js';
import type { WalkContext, NormalizedProblem } from './walk.js';
import type { Document, ResolvedRefMap } from './resolve.js';
import type { CollectFn } from './types.js';

export type CoreBundleOptions = {
  externalRefResolver?: BaseResolver;
  config: Config;
  dereference?: boolean;
  base?: string | null;
  removeUnusedComponents?: boolean;
  keepUrlRefs?: boolean;
};

export function collectConfigPlugins(
  document: Document,
  resolvedRefMap: ResolvedRefMap,
  rootConfigDir: string
) {
  const visitorsData: PluginsCollectorVisitorData = { plugins: [], rootConfigDir };
  const ctx: BundleContext = {
    problems: [],
    specVersion: 'oas3_0', // TODO: change it to a config-specific type
    refTypes: new Map<string, NormalizedNodeType>(),
    visitorsData: {
      [PLUGINS_COLLECTOR_VISITOR_ID]: visitorsData,
    },
  };

  walkDocument({
    document,
    rootType: NormalizedConfigTypes.ConfigRoot,
    normalizedVisitors: pluginsCollectorVisitor,
    resolvedRefMap,
    ctx,
  });

  return visitorsData.plugins;
}

export function bundleConfig(
  document: Document,
  resolvedRefMap: ResolvedRefMap,
  plugins: Plugin[]
): ResolvedConfig {
  const visitorsData: ConfigBundlerVisitorData = { plugins };
  const ctx: BundleContext = {
    problems: [],
    specVersion: 'oas3_0', // TODO: change it to a config-specific type
    refTypes: new Map<string, NormalizedNodeType>(),
    visitorsData: {
      [CONFIG_BUNDLER_VISITOR_ID]: visitorsData,
    },
  };

  walkDocument({
    document,
    rootType: NormalizedConfigTypes.ConfigRoot,
    normalizedVisitors: configBundlerVisitor,
    resolvedRefMap,
    ctx,
  });

  return document.parsed ?? {};
}

export async function bundle(
  opts: {
    ref?: string;
    doc?: Document;
    collectSpecData?: CollectFn;
  } & CoreBundleOptions
) {
  const {
    ref,
    doc,
    externalRefResolver = new BaseResolver(opts.config.resolve),
    base = null,
  } = opts;
  if (!(ref || doc)) {
    throw new Error('Document or reference is required.\n');
  }

  const document =
    doc === undefined ? await externalRefResolver.resolveDocument(base, ref!, true) : doc;

  if (document instanceof Error) {
    throw document;
  }
  opts.collectSpecData?.(document.parsed);

  return bundleDocument({
    document,
    ...opts,
    externalRefResolver,
    types: getTypes(detectSpec(document.parsed)),
  });
}

export async function bundleFromString(
  opts: {
    source: string;
    absoluteRef?: string;
  } & CoreBundleOptions
) {
  const { source, absoluteRef, externalRefResolver = new BaseResolver(opts.config.resolve) } = opts;
  const document = makeDocumentFromString(source, absoluteRef || '/');

  return bundleDocument({
    document,
    ...opts,
    externalRefResolver,
    types: getTypes(detectSpec(document.parsed)),
  });
}

type BundleContext = WalkContext;

export type BundleResult = {
  bundle: Document;
  problems: NormalizedProblem[];
  fileDependencies: Set<string>;
  rootType: NormalizedNodeType;
  refTypes?: Map<string, NormalizedNodeType>;
  visitorsData: Record<string, Record<string, unknown>>;
};
