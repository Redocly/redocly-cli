import { isRef, parseRef } from '../../ref-utils.js';
import type {
  Oas3Definition,
  Oas3_1Definition,
  Oas3_2Definition,
  Oas3Components,
  Oas3_1Components,
  Oas3_2Components,
  Oas3Schema,
  Oas3_1Schema,
} from '../../typings/openapi.js';
import { isEmptyObject } from '../../utils/is-empty-object.js';
import { hasComponent } from '../../utils/oas-has-component.js';
import type { Oas3Decorator } from '../../visitors.js';

type AnyOas3Definition = Oas3Definition | Oas3_1Definition | Oas3_2Definition;
type AnyOas3ComponentsKey = keyof Oas3Components | keyof Oas3_1Components | keyof Oas3_2Components;
type ComponentInfo = {
  usedIn: string[];
  componentType?: AnyOas3ComponentsKey;
  name: string;
  referencesDiscriminator?: boolean;
};

function getComponentKey(pointer: string): string | undefined {
  if (!pointer.startsWith('#/components/')) return;
  const [_component, type, name] = parseRef(pointer).pointer;
  if (!type || !name) return;
  return `${type}/${name}`;
}

export const RemoveUnusedComponents: Oas3Decorator = () => {
  const components = new Map<string, ComponentInfo>();

  function registerComponent(
    componentType: AnyOas3ComponentsKey,
    name: string,
    referencesDiscriminator: boolean = false
  ): void {
    const key = `${componentType}/${name}`;
    components.set(key, {
      usedIn: components.get(key)?.usedIn ?? [],
      componentType,
      name,
      referencesDiscriminator,
    });
  }

  function removeUnusedComponents(
    root: AnyOas3Definition,
    removedKeys: Set<string> = new Set()
  ): number {
    const removedCountBefore = removedKeys.size;

    for (const [key, { usedIn, name, componentType, referencesDiscriminator }] of components) {
      const used =
        usedIn.some((sourceKey) => sourceKey !== key && !removedKeys.has(sourceKey)) ||
        referencesDiscriminator;

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
            'SecurityScheme',
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
      Schema(schema, ctx) {
        const referencesDiscriminator = schema.allOf?.some(
          (ref) => isRef(ref) && ctx.resolve<Oas3Schema | Oas3_1Schema>(ref)?.node?.discriminator
        );
        registerComponent('schemas', ctx.key.toString(), referencesDiscriminator);
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
    NamedSecuritySchemes: {
      SecurityScheme(_securityScheme, { key }) {
        registerComponent('securitySchemes', key.toString());
      },
    },
    SecurityRequirement(requirements) {
      for (const schemeName of Object.keys(requirements)) {
        // Security requirements reference security schemes by name, so we know that this security scheme is used in a SecurityRequirement.
        const key = `securitySchemes/${schemeName}`;
        const registered = components.get(key);
        if (registered) {
          registered.usedIn.push('SecurityRequirement');
        } else {
          components.set(key, {
            usedIn: ['SecurityRequirement'],
            name: schemeName,
          });
        }
      }
    },
  };
};
