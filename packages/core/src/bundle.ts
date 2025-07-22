import { BaseResolver, resolveDocument, makeRefId, makeDocumentFromString } from './resolve.js';
import { normalizeVisitors } from './visitors.js';
import { normalizeTypes } from './types/index.js';
import { walkDocument } from './walk.js';
import { detectSpec, getTypes, getMajorSpecVersion, type SpecMajorVersion } from './oas-types.js';
import { isAbsoluteUrl, isExternalValue, isRef, refBaseName, replaceRef } from './ref-utils.js';
import { initRules } from './config/rules.js';
import { reportUnresolvedRef } from './rules/common/no-unresolved-refs.js';
import { dequal, isTruthy } from './utils.js';
import { RemoveUnusedComponents as RemoveUnusedComponentsOas2 } from './decorators/oas2/remove-unused-components.js';
import { RemoveUnusedComponents as RemoveUnusedComponentsOas3 } from './decorators/oas3/remove-unused-components.js';
import { NormalizedConfigTypes } from './types/redocly-yaml.js';
import { type Config } from './config/index.js';
import {
  CONFIG_BUNDLER_VISITOR_ID,
  configBundlerVisitor,
  pluginsCollectorVisitor,
  PLUGINS_COLLECTOR_VISITOR_ID,
} from './config/visitors.js';

import type { ConfigBundlerVisitorData, PluginsCollectorVisitorData } from './config/visitors.js';
import type { Plugin, ResolvedConfig } from './config/types.js';
import type { Location } from './ref-utils.js';
import type { Oas3Visitor, Oas2Visitor } from './visitors.js';
import type { NormalizedNodeType, NodeType } from './types/index.js';
import type { WalkContext, UserContext, ResolveResult, NormalizedProblem } from './walk.js';
import type { OasRef } from './typings/openapi.js';
import type { Document, ResolvedRefMap } from './resolve.js';
import type { CollectFn } from './utils.js';

export enum OasVersion {
  Version2 = 'oas2',
  Version3_0 = 'oas3_0',
  Version3_1 = 'oas3_1',
}
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
    oasVersion: 'oas3_0', // TODO: change it after we rename oasVersion to specVersion
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
    oasVersion: 'oas3_0', // TODO: change it after we rename oasVersion to specVersion
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

export async function bundleDocument(opts: {
  document: Document;
  config: Config;
  customTypes?: Record<string, NodeType>;
  externalRefResolver: BaseResolver;
  dereference?: boolean;
  removeUnusedComponents?: boolean;
  keepUrlRefs?: boolean;
}): Promise<BundleResult> {
  const {
    document,
    config,
    customTypes,
    externalRefResolver,
    dereference = false,
    removeUnusedComponents = false,
    keepUrlRefs = false,
  } = opts;
  const specVersion = detectSpec(document.parsed);
  const specMajorVersion = getMajorSpecVersion(specVersion);
  const rules = config.getRulesForSpecVersion(specMajorVersion);
  const types = normalizeTypes(
    config.extendTypes(customTypes ?? getTypes(specVersion), specVersion),
    config
  );

  const preprocessors = initRules(rules, config, 'preprocessors', specVersion);
  const decorators = initRules(rules, config, 'decorators', specVersion);

  const ctx: BundleContext = {
    problems: [],
    oasVersion: specVersion,
    refTypes: new Map<string, NormalizedNodeType>(),
    visitorsData: {},
  };

  if (removeUnusedComponents) {
    decorators.push({
      severity: 'error',
      ruleId: 'remove-unused-components',
      visitor:
        specMajorVersion === 'oas2'
          ? RemoveUnusedComponentsOas2({})
          : RemoveUnusedComponentsOas3({}),
    });
  }

  let resolvedRefMap = await resolveDocument({
    rootDocument: document,
    rootType: types.Root,
    externalRefResolver,
  });

  if (preprocessors.length > 0) {
    // Make additional pass to resolve refs defined in preprocessors.
    walkDocument({
      document,
      rootType: types.Root as NormalizedNodeType,
      normalizedVisitors: normalizeVisitors(preprocessors, types),
      resolvedRefMap,
      ctx,
    });
    resolvedRefMap = await resolveDocument({
      rootDocument: document,
      rootType: types.Root,
      externalRefResolver,
    });
  }

  const bundleVisitor = normalizeVisitors(
    [
      {
        severity: 'error',
        ruleId: 'bundler',
        visitor: makeBundleVisitor(
          specMajorVersion,
          dereference,
          document,
          resolvedRefMap,
          keepUrlRefs
        ),
      },
      ...decorators,
    ],
    types
  );

  walkDocument({
    document,
    rootType: types.Root,
    normalizedVisitors: bundleVisitor,
    resolvedRefMap,
    ctx,
  });

  return {
    bundle: document,
    problems: ctx.problems.map((problem) => config.addProblemToIgnore(problem)),
    fileDependencies: externalRefResolver.getFiles(),
    rootType: types.Root,
    refTypes: ctx.refTypes,
    visitorsData: ctx.visitorsData,
  };
}

export function mapTypeToComponent(typeName: string, version: SpecMajorVersion) {
  switch (version) {
    case 'oas3':
      switch (typeName) {
        case 'Schema':
          return 'schemas';
        case 'Parameter':
          return 'parameters';
        case 'Response':
          return 'responses';
        case 'Example':
          return 'examples';
        case 'RequestBody':
          return 'requestBodies';
        case 'Header':
          return 'headers';
        case 'SecuritySchema':
          return 'securitySchemes';
        case 'Link':
          return 'links';
        case 'Callback':
          return 'callbacks';
        default:
          return null;
      }
    case 'oas2':
      switch (typeName) {
        case 'Schema':
          return 'definitions';
        case 'Parameter':
          return 'parameters';
        case 'Response':
          return 'responses';
        default:
          return null;
      }
    case 'async2':
      switch (typeName) {
        case 'Schema':
          return 'schemas';
        case 'Parameter':
          return 'parameters';
        default:
          return null;
      }
    case 'async3':
      switch (typeName) {
        case 'Schema':
          return 'schemas';
        case 'Parameter':
          return 'parameters';
        default:
          return null;
      }
    case 'arazzo1':
      switch (typeName) {
        case 'Root.workflows_items.parameters_items':
        case 'Root.workflows_items.steps_items.parameters_items':
          return 'parameters';
        default:
          return null;
      }
    case 'overlay1':
      switch (typeName) {
        default:
          return null;
      }
  }
}

function makeBundleVisitor(
  version: SpecMajorVersion,
  dereference: boolean,
  rootDocument: Document,
  resolvedRefMap: ResolvedRefMap,
  keepUrlRefs: boolean
) {
  let components: Record<string, Record<string, any>>;
  let rootLocation: Location;

  const visitor: Oas3Visitor | Oas2Visitor = {
    ref: {
      leave(node, ctx, resolved) {
        if (!resolved.location || resolved.node === undefined) {
          reportUnresolvedRef(resolved, ctx.report, ctx.location);
          return;
        }
        if (
          resolved.location.source === rootDocument.source &&
          resolved.location.source === ctx.location.source &&
          ctx.type.name !== 'scalar' &&
          !dereference
        ) {
          return;
        }

        if (keepUrlRefs && isAbsoluteUrl(node.$ref)) {
          return;
        }

        const componentType = mapTypeToComponent(ctx.type.name, version);
        if (!componentType) {
          replaceRef(node, resolved, ctx);
        } else {
          if (dereference) {
            saveComponent(componentType, resolved, ctx);
            replaceRef(node, resolved, ctx);
          } else {
            node.$ref = saveComponent(componentType, resolved, ctx);
            resolveBundledComponent(node, resolved, ctx);
          }
        }
      },
    },
    Example: {
      leave(node: any, ctx: UserContext) {
        if (isExternalValue(node) && node.value === undefined) {
          const resolved = ctx.resolve({ $ref: node.externalValue });

          if (!resolved.location || resolved.node === undefined) {
            reportUnresolvedRef(resolved, ctx.report, ctx.location);
            return;
          }

          if (keepUrlRefs && isAbsoluteUrl(node.externalValue)) {
            return;
          }

          node.value = ctx.resolve({ $ref: node.externalValue }).node;
          delete node.externalValue;
        }
      },
    },
    Root: {
      enter(root: any, ctx: UserContext) {
        rootLocation = ctx.location;
        if (version === 'oas3') {
          components = root.components = root.components || {};
        } else if (version === 'oas2') {
          components = root;
        } else if (version === 'async2') {
          components = root.components = root.components || {};
        } else if (version === 'async3') {
          components = root.components = root.components || {};
        } else if (version === 'arazzo1') {
          components = root.components = root.components || {};
        }
      },
    },
  };

  if (version === 'oas3') {
    visitor.DiscriminatorMapping = {
      leave(mapping: Record<string, string>, ctx: UserContext) {
        for (const name of Object.keys(mapping)) {
          const $ref = mapping[name];
          const resolved = ctx.resolve({ $ref });
          if (!resolved.location || resolved.node === undefined) {
            reportUnresolvedRef(resolved, ctx.report, ctx.location.child(name));
            return;
          }

          const componentType = mapTypeToComponent('Schema', version)!;
          mapping[name] = saveComponent(componentType, resolved, ctx);
        }
      },
    };
  }

  function resolveBundledComponent(node: OasRef, resolved: ResolveResult<any>, ctx: UserContext) {
    const newRefId = makeRefId(ctx.location.source.absoluteRef, node.$ref);
    resolvedRefMap.set(newRefId, {
      document: rootDocument,
      isRemote: false,
      node: resolved.node,
      nodePointer: node.$ref,
      resolved: true,
    });
  }

  function saveComponent(
    componentType: string,
    target: { node: unknown; location: Location },
    ctx: UserContext
  ) {
    components[componentType] = components[componentType] || {};
    const name = getComponentName(target, componentType, ctx);
    components[componentType][name] = target.node;
    if (version === 'oas3' || version === 'async2' || version === 'async3') {
      return `#/components/${componentType}/${name}`;
    } else {
      return `#/${componentType}/${name}`;
    }
  }

  function isEqualOrEqualRef(
    node: unknown,
    target: { node: unknown; location: Location },
    ctx: UserContext
  ) {
    if (
      isRef(node) &&
      ctx.resolve(node, rootLocation.absolutePointer).location?.absolutePointer ===
        target.location.absolutePointer
    ) {
      return true;
    }

    return dequal(node, target.node);
  }

  function getComponentName(
    target: { node: unknown; location: Location },
    componentType: string,
    ctx: UserContext
  ) {
    const [fileRef, pointer] = [target.location.source.absoluteRef, target.location.pointer];
    const componentsGroup = components[componentType];

    let name = '';

    const refParts = pointer.slice(2).split('/').filter(isTruthy); // slice(2) removes "#/"
    while (refParts.length > 0) {
      name = refParts.pop() + (name ? `-${name}` : '');
      if (
        !componentsGroup ||
        !componentsGroup[name] ||
        isEqualOrEqualRef(componentsGroup[name], target, ctx)
      ) {
        return name;
      }
    }

    name = refBaseName(fileRef) + (name ? `_${name}` : '');
    if (!componentsGroup[name] || isEqualOrEqualRef(componentsGroup[name], target, ctx)) {
      return name;
    }

    const prevName = name;
    let serialId = 2;
    while (componentsGroup[name] && !isEqualOrEqualRef(componentsGroup[name], target, ctx)) {
      name = `${prevName}-${serialId}`;
      serialId++;
    }

    if (!componentsGroup[name]) {
      ctx.report({
        message: `Two schemas are referenced with the same name but different content. Renamed ${prevName} to ${name}.`,
        location: ctx.location,
        forceSeverity: 'warn',
      });
    }

    return name;
  }

  return visitor;
}
