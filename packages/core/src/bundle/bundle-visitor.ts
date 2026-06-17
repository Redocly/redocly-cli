import { type RuleSeverity } from '../config/types.js';
import { COMPONENT_NAME_CHARS, type SpecMajorVersion } from '../oas-types.js';
import {
  isAbsoluteUrl,
  replaceRef,
  isExternalValue,
  isRef,
  pointerBaseName,
  refBaseName,
  type Location,
  isMappingRef,
} from '../ref-utils.js';
import { type ResolvedRefMap, type Document } from '../resolve.js';
import { reportUnresolvedRef } from '../rules/common/no-unresolved-refs.js';
import { type OasRef, type Oas3Discriminator, type Oas3Example } from '../typings/openapi.js';
import { dequal } from '../utils/dequal.js';
import { isPlainObject } from '../utils/is-plain-object.js';
import { isString } from '../utils/is-string.js';
import { makeRefId } from '../utils/make-ref-id.js';
import { toPascalCase } from '../utils/to-pascal-case.js';
import { type Oas3Visitor, type Oas2Visitor } from '../visitors.js';
import { type UserContext, type ResolveResult, type Problem } from '../walk.js';
import { type ComponentNamesStrategy } from './bundle-document.js';

type ComponentTarget = { node: unknown; location: Location };
type ComponentsGroup = Record<string, unknown>;

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
        case 'MediaTypesMap':
          return 'mediaTypes';
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
    case 'openrpc1':
      switch (typeName) {
        case 'ContentDescriptor':
          return 'contentDescriptors';
        case 'Schema':
          return 'schemas';
        case 'Example':
          return 'examples';
        case 'Link':
          return 'links';
        case 'ErrorObject':
          return 'errors';
        case 'ExamplePairing':
          return 'examplePairingObjects';
        case 'Tag':
          return 'tags';
        default:
          return null;
      }
    case 'protobuf':
      return null;
  }
}

export function makeBundleVisitor({
  version,
  dereference,
  rootDocument,
  resolvedRefMap,
  keepUrlRefs,
  componentRenamingConflicts = 'warn',
  componentNamesStrategy = 'basename',
}: {
  version: SpecMajorVersion;
  dereference: boolean;
  rootDocument: Document;
  resolvedRefMap: ResolvedRefMap;
  keepUrlRefs: boolean;
  componentRenamingConflicts?: RuleSeverity;
  componentNamesStrategy?: ComponentNamesStrategy;
}) {
  let components: Record<string, ComponentsGroup>;
  let rootLocation: Location;

  const firstSchemaLocationByName = new Map<string, Location>();

  const schemaComponentType = mapTypeToComponent('Schema', version)!;

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
          // Normalize explicit self-file refs to internal pointer
          if (node.$ref !== resolved.location.pointer) {
            node.$ref = resolved.location.pointer;
          }

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
          delete (node as Oas3Example).externalValue;
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
        } else if (version === 'openrpc1') {
          components = root.components = root.components || {};
        } else if (version === 'protobuf') {
          components = {};
        }
      },
    },
  };

  if (version === 'oas3') {
    visitor.Discriminator = {
      leave(discriminator: Oas3Discriminator, ctx: UserContext) {
        if (
          typeof discriminator.defaultMapping !== 'string' ||
          !isMappingRef(discriminator.defaultMapping)
        ) {
          return;
        }

        const resolved = ctx.resolve({ $ref: discriminator.defaultMapping });
        if (!resolved.location || resolved.node === undefined) {
          reportUnresolvedRef(resolved, ctx.report, ctx.location.child('defaultMapping'));
          return;
        }

        discriminator.defaultMapping = saveComponent(schemaComponentType, resolved, ctx);
      },
      DiscriminatorMapping: {
        leave(mapping, ctx) {
          for (const name of Object.keys(mapping)) {
            const $ref = mapping[name];
            if (!isMappingRef($ref)) {
              continue;
            }
            const resolved = ctx.resolve({ $ref });
            if (!resolved.location || resolved.node === undefined) {
              reportUnresolvedRef(resolved, ctx.report, ctx.location.child(name));
              return;
            }

            mapping[name] = saveComponent(schemaComponentType, resolved, ctx);
          }
        },
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

  function saveComponent(componentType: string, target: ComponentTarget, ctx: UserContext) {
    components[componentType] = components[componentType] || {};
    const name = getComponentName(target, componentType, ctx);
    components[componentType][name] = target.node;
    if (
      version === 'oas3' ||
      version === 'async2' ||
      version === 'async3' ||
      version === 'openrpc1'
    ) {
      return `#/components/${componentType}/${name}`;
    } else {
      return `#/${componentType}/${name}`;
    }
  }

  function isEqualOrEqualRef(node: unknown, target: ComponentTarget, ctx: UserContext) {
    if (
      isRef(node) &&
      ctx.resolve(node, rootLocation.absolutePointer).location?.absolutePointer ===
        target.location.absolutePointer
    ) {
      return true;
    }

    return dequal(node, target.node);
  }

  function componentNameFromTitle(
    target: ComponentTarget,
    componentsGroup: ComponentsGroup,
    ctx: UserContext
  ): { key: string; problem?: Problem } {
    const { node } = target;
    const title = isPlainObject(node) && isString(node.title) ? node.title.trim() : '';
    const key = toPascalCase(title).replace(new RegExp(`[^${COMPONENT_NAME_CHARS}]`, 'g'), '-');
    const titleLocation = target.location.child('title');

    if (title === '') {
      return {
        key,
        problem: {
          message: 'Schema must define a `title` when using `--component-names-strategy title`.',
          location: target.location,
          forceSeverity: 'error',
        },
      };
    }

    if (componentsGroup[key] && !isEqualOrEqualRef(componentsGroup[key], target, ctx)) {
      return {
        key,
        problem: {
          message:
            `Title "${title}" maps to component name \`${key}\`, ` +
            `already used by another schema. Rename one of the titles.`,
          location: titleLocation,
          from: firstSchemaLocationByName.get(key),
          forceSeverity: componentRenamingConflicts,
        },
      };
    }
    return { key };
  }

  function componentNameFromBasename(
    target: ComponentTarget,
    componentsGroup: ComponentsGroup,
    ctx: UserContext
  ): { name: string; prevName: string } {
    const prevName =
      pointerBaseName(target.location.pointer) || refBaseName(target.location.source.absoluteRef);
    let name = prevName;
    for (
      let serialId = 2;
      componentsGroup[name] && !isEqualOrEqualRef(componentsGroup[name], target, ctx);
      serialId++
    ) {
      name = `${prevName}-${serialId}`;
    }
    return { name, prevName };
  }

  function getComponentName(target: ComponentTarget, componentType: string, ctx: UserContext) {
    const componentsGroup = components[componentType];

    if (componentNamesStrategy === 'title' && componentType === schemaComponentType) {
      const { key, problem } = componentNameFromTitle(target, componentsGroup, ctx);
      if (!problem) {
        firstSchemaLocationByName.set(key, target.location.child('title'));
        return key;
      }
      const { name } = componentNameFromBasename(target, componentsGroup, ctx);
      if (!componentsGroup[name]) {
        ctx.report(problem);
        firstSchemaLocationByName.set(name, target.location);
      }
      return name;
    }

    const { name, prevName } = componentNameFromBasename(target, componentsGroup, ctx);
    if (!componentsGroup[name] && prevName !== name) {
      ctx.report({
        message: `Two schemas are referenced with the same name but different content. Renamed ${prevName} to ${name}.`,
        location: ctx.location,
        forceSeverity: componentRenamingConflicts,
      });
    }
    return name;
  }

  return visitor;
}
