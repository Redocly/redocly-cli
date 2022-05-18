import isEqual = require('lodash.isequal');
import { BaseResolver, resolveDocument, Document, ResolvedRefMap, makeRefId } from './resolve';
import { Oas3Rule, normalizeVisitors, Oas3Visitor, Oas2Visitor } from './visitors';
import { Oas3Types } from './types/oas3';
import { Oas2Types } from './types/oas2';
import { Oas3_1Types } from './types/oas3_1';
import { NormalizedNodeType, normalizeTypes, NodeType } from './types';
import { WalkContext, walkDocument, UserContext, ResolveResult } from './walk';
import { detectOpenAPI, openAPIMajor, OasMajorVersion } from './oas-types';
import { isRef, Location, refBaseName } from './ref-utils';
import { initRules } from './config/rules';
import { reportUnresolvedRef } from './rules/no-unresolved-refs';
import { isPlainObject } from './utils';
import { OasRef } from './typings/openapi';
import { isRedoclyRegistryURL } from './redocly';
import { RemoveUnusedComponents as RemoveUnusedComponentsOas2 } from './rules/oas2/remove-unused-components';
import { RemoveUnusedComponents as RemoveUnusedComponentsOas3 } from './rules/oas3/remove-unused-components';

import type { Config, LintConfig } from './config';

export type Oas3RuleSet = Record<string, Oas3Rule>;

export enum OasVersion {
  Version2 = 'oas2',
  Version3_0 = 'oas3_0',
  Version3_1 = 'oas3_1',
}

export async function bundle(opts: {
  ref?: string;
  doc?: Document;
  externalRefResolver?: BaseResolver;
  config: Config;
  dereference?: boolean;
  base?: string;
  skipRedoclyRegistryRefs?: boolean;
  removeUnusedComponents?: boolean;
}) {
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
    doc !== undefined ? doc : await externalRefResolver.resolveDocument(base, ref!, true);

  if (document instanceof Error) {
    throw document;
  }

  return bundleDocument({
    document,
    ...opts,
    config: opts.config.lint,
    externalRefResolver,
  });
}

type BundleContext = WalkContext;

export async function bundleDocument(opts: {
  document: Document;
  config: LintConfig;
  customTypes?: Record<string, NodeType>;
  externalRefResolver: BaseResolver;
  dereference?: boolean;
  skipRedoclyRegistryRefs?: boolean;
  removeUnusedComponents?: boolean;
}) {
  const {
    document,
    config,
    customTypes,
    externalRefResolver,
    dereference = false,
    skipRedoclyRegistryRefs = false,
    removeUnusedComponents = false,
  } = opts;
  const oasVersion = detectOpenAPI(document.parsed);
  const oasMajorVersion = openAPIMajor(oasVersion);
  const rules = config.getRulesForOasVersion(oasMajorVersion);
  const types = normalizeTypes(
    config.extendTypes(
      customTypes ?? oasMajorVersion === OasMajorVersion.Version3
        ? oasVersion === OasVersion.Version3_1
          ? Oas3_1Types
          : Oas3Types
        : Oas2Types,
      oasVersion,
    ),
    config,
  );

  const preprocessors = initRules(rules as any, config, 'preprocessors', oasVersion);
  const decorators = initRules(rules as any, config, 'decorators', oasVersion);

  const ctx: BundleContext = {
    problems: [],
    oasVersion: oasVersion,
    refTypes: new Map<string, NormalizedNodeType>(),
    visitorsData: {},
  };

  if (removeUnusedComponents) {
    decorators.push({
      severity: 'error',
      ruleId: 'remove-unused-components',
      visitor: oasMajorVersion === OasMajorVersion.Version2
        ? RemoveUnusedComponentsOas2({})
        : RemoveUnusedComponentsOas3({})
    })
  }

  const resolvedRefMap = await resolveDocument({
    rootDocument: document,
    rootType: types.DefinitionRoot,
    externalRefResolver,
  });

  const bundleVisitor = normalizeVisitors(
    [
      ...preprocessors,
      {
        severity: 'error',
        ruleId: 'bundler',
        visitor: makeBundleVisitor(oasMajorVersion, dereference, skipRedoclyRegistryRefs, document, resolvedRefMap),
      },
      ...decorators,
    ] as any,
    types,
  );

  walkDocument({
    document,
    rootType: types.DefinitionRoot as NormalizedNodeType,
    normalizedVisitors: bundleVisitor,
    resolvedRefMap,
    ctx,
  });

  return {
    bundle: document,
    problems: ctx.problems.map((problem) => config.addProblemToIgnore(problem)),
    fileDependencies: externalRefResolver.getFiles(),
    rootType: types.DefinitionRoot,
    refTypes: ctx.refTypes,
    visitorsData: ctx.visitorsData,
  };
}

export function mapTypeToComponent(typeName: string, version: OasMajorVersion) {
  switch (version) {
    case OasMajorVersion.Version3:
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
    case OasMajorVersion.Version2:
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
  }
}

// function oas3Move

function makeBundleVisitor(
  version: OasMajorVersion,
  dereference: boolean,
  skipRedoclyRegistryRefs: boolean,
  rootDocument: Document,
  resolvedRefMap: ResolvedRefMap
) {
  let components: Record<string, Record<string, any>>;

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

        // do not bundle registry URL before push, otherwise we can't record dependencies
        if (skipRedoclyRegistryRefs && isRedoclyRegistryURL(node.$ref)) {
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
    DefinitionRoot: {
      enter(root: any) {
        if (version === OasMajorVersion.Version3) {
          components = root.components = root.components || {};
        } else if (version === OasMajorVersion.Version2) {
          components = root;
        }
      },
    },
  };

  if (version === OasMajorVersion.Version3) {
    visitor.DiscriminatorMapping = {
      leave(mapping: Record<string, string>, ctx: any) {
        for (const name of Object.keys(mapping)) {
          const $ref = mapping[name];
          const resolved = ctx.resolve({ $ref });
          if (!resolved.location || resolved.node === undefined) {
            reportUnresolvedRef(resolved, ctx.report, ctx.location.child(name));
            return;
          }

          const componentType = mapTypeToComponent('Schema', version)!;
          if (dereference) {
            saveComponent(componentType, resolved, ctx);
          } else {
            mapping[name] = saveComponent(componentType, resolved, ctx);
          }
        }
      },
    };
  }

  function resolveBundledComponent(node: OasRef, resolved: ResolveResult<any>, ctx: UserContext) {
    const newRefId = makeRefId(ctx.location.source.absoluteRef, node.$ref)
    resolvedRefMap.set(newRefId, {
      document: rootDocument,
      isRemote: false,
      node: resolved.node,
      nodePointer: node.$ref,
      resolved: true,
    });
  }

  function replaceRef(ref: OasRef, resolved: ResolveResult<any>, ctx: UserContext) {
    if (!isPlainObject(resolved.node)) {
      ctx.parent[ctx.key] = resolved.node;
    } else {
      // @ts-ignore
      delete ref.$ref;
      Object.assign(ref, resolved.node);
    }
  }

  function saveComponent(
    componentType: string,
    target: { node: any; location: Location },
    ctx: UserContext,
  ) {
    components[componentType] = components[componentType] || {};
    const name = getComponentName(target, componentType, ctx);
    components[componentType][name] = target.node;
    if (version === OasMajorVersion.Version3) {
      return `#/components/${componentType}/${name}`;
    } else {
      return `#/${componentType}/${name}`;
    }
  }

  function isEqualOrEqualRef(
    node: any,
    target: { node: any; location: Location },
    ctx: UserContext,
  ) {
    if (
      isRef(node) &&
      ctx.resolve(node).location?.absolutePointer === target.location.absolutePointer
    ) {
      return true;
    }

    return isEqual(node, target.node);
  }

  function getComponentName(
    target: { node: any; location: Location },
    componentType: string,
    ctx: UserContext,
  ) {
    const [fileRef, pointer] = [target.location.source.absoluteRef, target.location.pointer];
    const componentsGroup = components[componentType];

    let name = '';

    const refParts = pointer.slice(2).split('/').filter(Boolean); // slice(2) removes "#/"
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
