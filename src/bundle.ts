import { BaseResolver, resolveDocument, Document } from './resolve';

import { OAS3Rule, normalizeVisitors, BaseVisitor } from './visitors';
import { NormalizedNodeType, OAS3Types, normalizeTypes, NodeType } from './types/oa3';
import { WalkContext, walkDocument } from './walk';
import { detectOpenAPI } from './validate';
import { Location, pointerBaseName, refBaseName } from './ref';

export enum OASVersion {
  Version2,
  Version3_0_x,
}

export type OAS3RuleSet = Record<string, OAS3Rule>;

// todo: fix visitors typing
export async function bundle(opts: { ref: string; externalRefResolver?: BaseResolver }) {
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
  customTypes?: Record<string, NodeType>;
  externalRefResolver?: BaseResolver;
}) {
  const { document, customTypes, externalRefResolver = new BaseResolver() } = opts;
  switch (detectOpenAPI(document.parsed)) {
    case OASVersion.Version2:
      throw new Error('OAS2 is not implemented yet');
    case OASVersion.Version3_0_x: {
      const types = normalizeTypes(customTypes ?? OAS3Types);

      const resolvedRefMap = await resolveDocument({
        rootDocument: document,
        rootType: types.DefinitionRoot,
        externalRefResolver,
      });

      const normalizedVisitors = normalizeVisitors(
        [
          {
            severity: 'error',
            ruleId: 'bundler',
            visitor: makeBundleVisitor(OASVersion.Version3_0_x),
          },
        ],
        types,
      );

      const ctx: BundleContext = {
        messages: [],
        oasVersion: OASVersion.Version3_0_x,
      };

      walkDocument({
        document,
        rootType: types.DefinitionRoot as NormalizedNodeType,
        normalizedVisitors,
        resolvedRefMap,
        ctx,
      });

      return { bundle: document.parsed, messages: ctx.messages };
    }
  }

  throw new Error('Not implemented');
}

function mapOAS3TypeToComponent(typeName: string) {
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
}

// function oas3Move

function makeBundleVisitor<T extends BaseVisitor>(version: OASVersion) {
  let components: Record<string, Record<string, any>>;

  // @ts-ignore
  const visitor: T = {
    ref(node, ctx, resolved) {
      if (!resolved.location || !resolved.node) return; // error is reported by walker

      // todo discriminator
      const componentType =
        version === OASVersion.Version3_0_x ? mapOAS3TypeToComponent(ctx.type.name) : null;
      if (!componentType) {
        delete node.$ref;
        Object.assign(node, resolved.node);
      } else {
        node.$ref = saveComponent(componentType, resolved);
      }

      function saveComponent(componentType: string, target: { node: any; location: Location }) {
        components[componentType] = components[componentType] || {};
        const name = getComponentName(target, componentType);
        components[componentType][name] = target.node;
        if (version === OASVersion.Version3_0_x) {
          return `#/components/${componentType}/${name}`;
        } else {
          throw new Error('Not implemented');
        }
      }

      function getComponentName(target: { node: any; location: Location }, componentType: string) {
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
    DefinitionRoot: {
      enter(root: any) {
        if (version === OASVersion.Version3_0_x) {
          components = root.components = root.components || {};
        } else if (version === OASVersion.Version2) {
          components = root;
        }
      },
    },
  };

  return visitor;
}
