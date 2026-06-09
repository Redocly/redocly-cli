import { type RuleSeverity } from '../config/types.js';
import { type SpecMajorVersion } from '../oas-types.js';
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
import { type UserContext, type ResolveResult } from '../walk.js';

type ComponentTarget = { node: unknown; location: Location };

/**
 * Characters allowed in a Components Object key by the OpenAPI and AsyncAPI specs — the same
 * pattern the `spec-components-invalid-map-name` rule enforces.
 */
const COMPONENT_NAME_PATTERN = /^[a-zA-Z0-9.\-_]+$/;

/** A schema's `title`, trimmed; `''` when it is missing or not a string. */
function schemaTitle(node: unknown): string {
  return isPlainObject(node) && isString(node.title) ? node.title.trim() : '';
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
  }
}

export function makeBundleVisitor({
  version,
  dereference,
  rootDocument,
  resolvedRefMap,
  keepUrlRefs,
  componentRenamingConflicts = 'warn',
  useTitlesForComponentNames = false,
}: {
  version: SpecMajorVersion;
  dereference: boolean;
  rootDocument: Document;
  resolvedRefMap: ResolvedRefMap;
  keepUrlRefs: boolean;
  componentRenamingConflicts?: RuleSeverity;
  useTitlesForComponentNames?: boolean;
}) {
  let components: Record<string, Record<string, unknown>>;
  let rootLocation: Location;

  const titleLocationByName = new Map<string, Location>();

  const schemaComponentType = mapTypeToComponent('Schema', version);

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
        }
      },
    },
  };

  if (version === 'oas3') {
    const componentType = schemaComponentType!;
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

        discriminator.defaultMapping = saveComponent(componentType, resolved, ctx);
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

            mapping[name] = saveComponent(componentType, resolved, ctx);
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

  // Unique component key from the source basename, suffixing `-N` on different-content conflicts.
  function basenameComponentName(
    target: ComponentTarget,
    componentsGroup: Record<string, unknown>,
    ctx: UserContext
  ) {
    const prevName =
      pointerBaseName(target.location.pointer) || refBaseName(target.location.source.absoluteRef);
    let name = prevName;
    let serialId = 2;
    while (componentsGroup[name] && !isEqualOrEqualRef(componentsGroup[name], target, ctx)) {
      name = `${prevName}-${serialId}`;
      serialId++;
    }
    return { name, prevName };
  }

  function componentNameFromTitle(
    target: ComponentTarget,
    componentsGroup: Record<string, unknown>,
    ctx: UserContext
  ) {
    const title = schemaTitle(target.node);
    const key = toPascalCase(title);
    const titleLocation = target.location.child('title');

    if (title === '') {
      return fallbackName(target, componentsGroup, ctx, {
        message: 'Schema must define a `title` to build a component name.',
        location: target.location,
      });
    }

    if (!COMPONENT_NAME_PATTERN.test(key)) {
      return fallbackName(target, componentsGroup, ctx, {
        message:
          `Title "${title}" can't be turned into a component name. ` +
          `Use only letters, digits, \`.\`, \`-\`, \`_\`, and spaces.`,
        location: titleLocation,
      });
    }

    // A different schema already uses this name.
    const existing = componentsGroup[key];
    if (existing && !isEqualOrEqualRef(existing, target, ctx)) {
      return fallbackName(target, componentsGroup, ctx, {
        message:
          `Title "${title}" maps to component name \`${key}\`, ` +
          `already used by another schema. Rename one of the titles.`,
        location: titleLocation,
        from: titleLocationByName.get(key),
      });
    }

    // The title is usable. Remember where the name was claimed so a later colliding title can
    // point back here, then use it.
    titleLocationByName.set(key, titleLocation);
    return key;
  }

  // File-based component name, reporting the given problem once — on the first `$ref` that stores
  // this schema, so repeat references to it stay quiet.
  function fallbackName(
    target: ComponentTarget,
    componentsGroup: Record<string, unknown>,
    ctx: UserContext,
    problem: { message: string; location: Location; from?: Location }
  ) {
    const name = basenameComponentName(target, componentsGroup, ctx).name;
    if (!componentsGroup[name]) {
      ctx.report({ ...problem, forceSeverity: 'error' });
    }
    return name;
  }

  function getComponentName(target: ComponentTarget, componentType: string, ctx: UserContext) {
    const componentsGroup = components[componentType];

    if (useTitlesForComponentNames && componentType === schemaComponentType) {
      return componentNameFromTitle(target, componentsGroup, ctx);
    }

    const { name, prevName } = basenameComponentName(target, componentsGroup, ctx);
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
