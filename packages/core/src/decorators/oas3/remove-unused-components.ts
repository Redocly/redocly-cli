import { parseRef } from '../../ref-utils.js';
import type {
  Oas3Definition,
  Oas3_1Definition,
  Oas3_2Definition,
  Oas3Components,
  Oas3_1Components,
  Oas3_2Components,
} from '../../typings/openapi.js';
import { isEmptyObject } from '../../utils/is-empty-object.js';
import { hasComponent } from '../../utils/oas-has-component.js';
import type { Oas3Decorator } from '../../visitors.js';

type AnyOas3Definition = Oas3Definition | Oas3_1Definition | Oas3_2Definition;
type AnyOas3ComponentsKey = keyof Oas3Components | keyof Oas3_1Components | keyof Oas3_2Components;

function getComponentKey(pointer: string): string | undefined {
  if (!pointer.startsWith('#/components/')) return;
  const [_component, type, name] = parseRef(pointer).pointer;
  if (!type || !name) return;
  return `${type}/${name}`;
}

export const RemoveUnusedComponents: Oas3Decorator = () => {
  const components = new Map<
    string,
    {
      usedIn: string[];
      componentType?: AnyOas3ComponentsKey;
      name: string;
    }
  >();

  function registerComponent(componentType: AnyOas3ComponentsKey, name: string): void {
    const key = `${componentType}/${name}`;
    components.set(key, {
      usedIn: components.get(key)?.usedIn ?? [],
      componentType,
      name,
    });
  }

  function removeUnusedComponents(
    root: AnyOas3Definition,
    removedKeys: Set<string> = new Set()
  ): number {
    const removedCountBefore = removedKeys.size;

    for (const [key, { usedIn, name, componentType }] of components) {
      const used = usedIn.some((sourceKey) => sourceKey !== key && !removedKeys.has(sourceKey));

      if (
        !used &&
        componentType &&
        root.components &&
        hasComponent(root.components, componentType)
      ) {
        removedKeys.add(key);
        const componentChild = root.components[componentType];
        delete componentChild![name];
        components.delete(key);
        if (isEmptyObject(componentChild)) {
          delete root.components[componentType];
        }
      }
    }

    return removedKeys.size > removedCountBefore
      ? removeUnusedComponents(root, removedKeys)
      : removedKeys.size;
  }

  return {
    ref: {
      leave(ref, { location, type, key }) {
        if (
          [
            'Schema',
            'Header',
            'Parameter',
            'Response',
            'Example',
            'RequestBody',
            'MediaTypesMap',
          ].includes(type.name)
        ) {
          const targetPointer = getComponentKey(ref.$ref);
          if (!targetPointer) return;

          const sourcePointer = getComponentKey(location.pointer) ?? location.pointer;
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

        if (isEmptyObject(root.components)) {
          delete root.components;
        }
      },
    },
    NamedSchemas: {
      Schema(schema, { key }) {
        if (!schema.allOf) {
          registerComponent('schemas', key.toString());
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
    NamedExamples: {
      Example(_example, { key }) {
        registerComponent('examples', key.toString());
      },
    },
    NamedRequestBodies: {
      RequestBody(_requestBody, { key }) {
        registerComponent('requestBodies', key.toString());
      },
    },
    NamedHeaders: {
      Header(_header, { key }) {
        registerComponent('headers', key.toString());
      },
    },
    NamedMediaTypes: {
      MediaTypesMap(_mediaTypesMap, { key }) {
        registerComponent('mediaTypes', key.toString());
      },
    },
  };
};
