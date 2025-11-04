import { isAbsoluteUrl, replaceRef, isExternalValue, isRef, refBaseName } from '../ref-utils.js';
import { makeRefId } from '../utils/make-ref-id.js';
import { reportUnresolvedRef } from '../rules/common/no-unresolved-refs.js';
import { isTruthy } from '../utils/is-truthy.js';
import { dequal } from '../utils/dequal.js';

import type { OasRef } from '../typings/openapi';
import type { Location } from '../ref-utils.js';
import type { Document } from '../resolve.js';
import type { ResolvedRefMap } from '../resolve';
import type { SpecMajorVersion } from '../oas-types';
import type { Oas3Visitor, Oas2Visitor } from '../visitors';
import type { UserContext, ResolveResult } from '../walk';

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

export function makeBundleVisitor(
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
            resolveBundledComponent(node, resolved);
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

  function resolveBundledComponent(node: OasRef, resolved: ResolveResult<any>) {
    // make ref from the root document to the bundled component
    const newRefId = makeRefId(rootDocument.source.absoluteRef, node.$ref);
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
