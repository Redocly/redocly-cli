import { BaseResolver, resolveDocument, Document } from './resolve';

import { Oas3Rule, normalizeVisitors, BaseVisitor } from './visitors';
import { Oas3Types } from './types/oas3';
import { NormalizedNodeType, normalizeTypes, NodeType } from './types';
import { WalkContext, walkDocument } from './walk';
import { detectOpenAPI, OasVersion } from './validate';
import { Location, pointerBaseName, refBaseName } from './ref-utils';
import { LintConfig } from './config/config';
import { initRules } from './config/rules';
import { reportUnresolvedRef } from './rules/no-unresolved-refs';

export type Oas3RuleSet = Record<string, Oas3Rule>;

// TODO: fix visitors typing
export async function bundle(opts: {
  ref: string;
  externalRefResolver?: BaseResolver;
  config: LintConfig;
}) {
  const { ref, externalRefResolver = new BaseResolver() } = opts;

  let document: Document;
  try {
    document = (await externalRefResolver.resolveDocument(null, ref)) as Document;
  } catch (e) {
    throw e;
  }

  return bundleDocument({
    document,
    ...opts,
  });
}

type BundleContext = WalkContext;

export async function bundleDocument(opts: {
  document: Document;
  config: LintConfig;
  customTypes?: Record<string, NodeType>;
  externalRefResolver?: BaseResolver;
}) {
  const { document, config, customTypes, externalRefResolver = new BaseResolver() } = opts;
  switch (detectOpenAPI(document.parsed)) {
    case OasVersion.Version2:
      throw new Error('OAS2 is not implemented yet');
    case OasVersion.Version3_0: {
      const oas3Rules = config.getRulesForOasVersion(OasVersion.Version3_0);

      const types = normalizeTypes(
        config.extendTypes(customTypes ?? Oas3Types, OasVersion.Version3_0),
      );

      const transformers = initRules(oas3Rules, config, true);

      const ctx: BundleContext = {
        messages: [],
        oasVersion: OasVersion.Version3_0,
      };

      const bundleVisitor = normalizeVisitors(
        [
          ...transformers,
          {
            severity: 'error',
            ruleId: 'bundler',
            visitor: makeBundleVisitor(OasVersion.Version3_0),
          },
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
        messages: ctx.messages.map((message) => config.addMessageToExceptions(message)),
      };
    }
  }
}

function mapTypeToComponent(typeName: string, version: OasVersion) {
  switch (version) {
    case OasVersion.Version3_0:
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
    default:
      throw new Error('Not implemented');
  }
}

// function oas3Move

function makeBundleVisitor<T extends BaseVisitor>(version: OasVersion) {
  let components: Record<string, Record<string, any>>;

  // @ts-ignore
  const visitor: T = {
    ref: {
      leave(node, ctx, resolved) {
        if (!resolved.location || resolved.node === undefined) {
          reportUnresolvedRef(resolved, ctx.report);
          return;
        }

        // TODO: discriminator
        const componentType = mapTypeToComponent(ctx.type.name, version);
        if (!componentType) {
          if (ctx.type.name === 'scalar') {
            ctx.parent[ctx.key] = resolved.node;
          } else {
            delete node.$ref;
            Object.assign(node, resolved.node);
          }
        } else {
          node.$ref = saveComponent(componentType, resolved);
        }

        function saveComponent(componentType: string, target: { node: any; location: Location }) {
          components[componentType] = components[componentType] || {};
          const name = getComponentName(target, componentType);
          components[componentType][name] = target.node;
          if (version === OasVersion.Version3_0) {
            return `#/components/${componentType}/${name}`;
          } else {
            throw new Error('Not implemented');
          }
        }

        function getComponentName(
          target: { node: any; location: Location },
          componentType: string,
        ) {
          const [fileRef, pointer] = [target.location.source.absoluteRef, target.location.pointer];

          const pointerBase = pointerBaseName(pointer);
          const refBase = refBaseName(fileRef);

          let name = pointerBase || refBase;

          const componentsGroup = components[componentType];
          if (!componentsGroup || !componentsGroup[name] || componentsGroup[name] === target.node)
            return name;

          if (pointerBase) {
            name = `${refBase}/${pointerBase}`;
            if (!componentsGroup[name] || componentsGroup[name] === target.node) return name;
          }

          const prevName = name;
          let serialId = 2;
          while (componentsGroup[name] && !componentsGroup[name] !== target.node) {
            name = `${name}-${serialId}`;
            serialId++;
          }

          ctx.report({
            message: `Two schemas are referenced with the same name but different content. Renamed ${prevName} to ${name}`,
            location: { reportOnKey: true },
          });

          return name;
        }
      },
    },
    DefinitionRoot: {
      enter(root: any) {
        if (version === OasVersion.Version3_0) {
          components = root.components = root.components || {};
        } else if (version === OasVersion.Version2) {
          components = root;
        }
      },
    },
  };

  return visitor;
}
