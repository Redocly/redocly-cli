import isEqual = require('lodash.isequal');

import { BaseResolver, resolveDocument, Document } from './resolve';

import { Oas3Rule, normalizeVisitors, Oas3Visitor, Oas2Visitor } from './visitors';
import { Oas3Types } from './types/oas3';
import { Oas2Types } from './types/oas2';
import { NormalizedNodeType, normalizeTypes, NodeType } from './types';
import { WalkContext, walkDocument, UserContext } from './walk';
import { detectOpenAPI, openAPIMajor, OasMajorVersion } from './validate';
import { Location, pointerBaseName, refBaseName } from './ref-utils';
import { Config, LintConfig } from './config/config';
import { initRules } from './config/rules';
import { reportUnresolvedRef } from './rules/no-unresolved-refs';

export type Oas3RuleSet = Record<string, Oas3Rule>;

export async function bundle(opts: {
  ref: string;
  externalRefResolver?: BaseResolver;
  config: Config;
}) {
  const { ref, externalRefResolver = new BaseResolver(opts.config.resolve) } = opts;

  let document: Document;
  try {
    document = (await externalRefResolver.resolveDocument(null, ref)) as Document;
  } catch (e) {
    throw e;
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
}) {
  const { document, config, customTypes, externalRefResolver } = opts;
  const oasVersion = detectOpenAPI(document.parsed);
  const oasMajorVersion = openAPIMajor(oasVersion);

  const rules = config.getRulesForOasVersion(oasMajorVersion);

  const types = normalizeTypes(
    config.extendTypes(
      customTypes ?? oasMajorVersion === OasMajorVersion.Version3 ? Oas3Types : Oas2Types,
      oasVersion,
    ),
  );

  const preprocessors = initRules(rules as any, config, 'preprocessors', oasVersion);
  const decorators = initRules(rules as any, config, 'decorators', oasVersion);

  const ctx: BundleContext = {
    messages: [],
    oasVersion: oasVersion,
  };

  const bundleVisitor = normalizeVisitors(
    [
      ...preprocessors,
      {
        severity: 'error',
        ruleId: 'bundler',
        visitor: makeBundleVisitor(oasMajorVersion),
      },
      ...decorators,
    ],
    types,
  );

  const resolvedRefMap = await resolveDocument({
    rootDocument: document,
    rootType: types.DefinitionRoot,
    externalRefResolver,
  });

  walkDocument({
    document,
    rootType: types.DefinitionRoot as NormalizedNodeType,
    normalizedVisitors: bundleVisitor,
    resolvedRefMap,
    ctx,
  });

  return {
    bundle: document.parsed,
    messages: ctx.messages.map((message) => config.addMessageToIgnore(message)),
    fileDependencies: externalRefResolver.getFiles(),
  };
}

function mapTypeToComponent(typeName: string, version: OasMajorVersion) {
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

function makeBundleVisitor(version: OasMajorVersion) {
  let components: Record<string, Record<string, any>>;

  const visitor: Oas3Visitor | Oas2Visitor = {
    ref: {
      leave(node, ctx, resolved) {
        if (!resolved.location || resolved.node === undefined) {
          reportUnresolvedRef(resolved, ctx.report, ctx.location);
          return;
        }
        const componentType = mapTypeToComponent(ctx.type.name, version);
        if (!componentType) {
          if (ctx.type.name === 'scalar') {
            ctx.parent[ctx.key] = resolved.node;
          } else {
            delete node.$ref;
            Object.assign(node, resolved.node);
          }
        } else {
          node.$ref = saveComponent(componentType, resolved, ctx);
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
          mapping[name] = saveComponent(componentType, resolved, ctx);
        }
      },
    };
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

  function getComponentName(
    target: { node: any; location: Location },
    componentType: string,
    ctx: UserContext,
  ) {
    const [fileRef, pointer] = [target.location.source.absoluteRef, target.location.pointer];

    const pointerBase = pointerBaseName(pointer);
    const refBase = refBaseName(fileRef);

    let name = pointerBase || refBase;

    const componentsGroup = components[componentType];
    if (!componentsGroup || !componentsGroup[name] || isEqual(componentsGroup[name], target.node))
      return name;

    if (pointerBase) {
      name = `${refBase}/${pointerBase}`;
      if (!componentsGroup[name] || isEqual(componentsGroup[name], target.node)) return name;
    }

    const prevName = name;
    let serialId = 2;
    while (componentsGroup[name] && !isEqual(componentsGroup[name], target.node)) {
      name = `${name}-${serialId}`;
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
