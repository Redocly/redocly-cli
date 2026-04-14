import { parseRef } from '../../ref-utils.js';
import type { Oas2Components, Oas2Definition } from '../../typings/swagger.js';
import { isEmptyObject } from '../../utils/is-empty-object.js';
import type { Oas2Decorator } from '../../visitors.js';

const OAS2_COMPONENT_TYPES: (keyof Oas2Components)[] = [
  'definitions',
  'parameters',
  'responses',
  'securityDefinitions',
];

export const RemoveUnusedComponents: Oas2Decorator = () => {
  const components = new Map<
    string,
    { usedIn: string[]; componentType?: keyof Oas2Components; name: string }
  >();

  function registerComponent(componentType: keyof Oas2Components, name: string): void {
    const key = `${componentType}/${name}`;
    components.set(key, {
      usedIn: components.get(key)?.usedIn ?? [],
      componentType,
      name,
    });
  }

  function getContainingComponentKey(pointer: string): string | undefined {
    if (!pointer.startsWith('#/')) return;
    const [type, name] = parseRef(pointer).pointer;
    if (!type || !name) return undefined;
    if (!OAS2_COMPONENT_TYPES.includes(type as keyof Oas2Components)) return undefined;
    return `${type}/${name}`;
  }

  function removeUnusedComponents(
    root: Oas2Definition,
    removedKeys: Set<string> = new Set()
  ): number {
    const countBefore = removedKeys.size;

    for (const [key, { usedIn, name, componentType }] of components) {
      const used = usedIn.some((sourceKey) => sourceKey !== key && !removedKeys.has(sourceKey));

      if (!used && componentType) {
        removedKeys.add(key);
        delete root[componentType]![name];
        components.delete(key);
        if (isEmptyObject(root[componentType])) {
          delete root[componentType];
        }
      }
    }

    return removedKeys.size > countBefore
      ? removeUnusedComponents(root, removedKeys)
      : removedKeys.size;
  }

  return {
    ref: {
      leave(ref, { location, type, key }) {
        if (['Schema', 'Parameter', 'Response', 'SecurityScheme'].includes(type.name)) {
          const targetPointer = getContainingComponentKey(ref.$ref);
          if (!targetPointer) return;

          const sourcePointer = getContainingComponentKey(location.pointer) ?? location.pointer;
          const registered = components.get(targetPointer);

          if (registered) {
            registered.usedIn.push(sourcePointer);
          } else {
            components.set(targetPointer, {
              usedIn: [sourcePointer],
              name: key.toString(),
            });
          }
        }
      },
    },
    Root: {
      leave(root, ctx) {
        const data = ctx.getVisitorData() as { removedCount: number };
        data.removedCount = removeUnusedComponents(root);
      },
    },
    NamedSchemas: {
      Schema(schema, { key }) {
        if (!schema.allOf) {
          registerComponent('definitions', key.toString());
        }
      },
    },
    NamedParameters: {
      Parameter(_parameter, { key }) {
        registerComponent('parameters', key.toString());
      },
    },
    NamedResponses: {
      Response(_response, { key }) {
        registerComponent('responses', key.toString());
      },
    },
    NamedSecuritySchemes: {
      SecurityScheme(_securityScheme, { key }) {
        registerComponent('securityDefinitions', key.toString());
      },
    },
  };
};
