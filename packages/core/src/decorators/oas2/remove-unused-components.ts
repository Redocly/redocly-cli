import { Location } from '../../ref-utils';
import { isEmptyObject } from '../../utils';

import type { Oas2Decorator } from '../../visitors';
import type { Oas2Components } from '../../typings/swagger';

export const RemoveUnusedComponents: Oas2Decorator = () => {
  const components = new Map<
    string,
    { used: null | Location[]; componentType?: keyof Oas2Components; name: string }
  >();

  function registerComponent(
    location: Location,
    componentType: keyof Oas2Components,
    name: string
  ): void {
    components.set(location.absolutePointer, {
      used: null,
      componentType,
      name,
      ...components.get(location.absolutePointer),
    });
  }

  return {
    ref: {
      leave(ref, { location, type, resolve, key }) {
        if (['Schema', 'Parameter', 'Response', 'SecurityScheme'].includes(type.name)) {
          const resolvedRef = resolve(ref);
          if (!resolvedRef.location) return;

          const [fileLocation, localPointer] = resolvedRef.location.absolutePointer.split('#', 2);
          const componentLevelLocalPointer = localPointer.split('/').slice(0, 3).join('/');
          const pointer = `${fileLocation}#${componentLevelLocalPointer}`;

          const registered = components.get(pointer);

          if (registered) {
            registered.used ??= [];
            registered.used.push(location);
          } else {
            components.set(pointer, {
              used: [location],
              name: key.toString(),
            });
          }
        }
      },
    },
    Root: {
      leave(root, ctx) {
        const data = ctx.getVisitorData() as { removedCount: number };
        data.removedCount = 0;

        const removedPaths: string[] = [];
        const rootComponents: Array<keyof Oas2Components> = [];

        let lastRemoveCount = 0;
        do {
          for (const [path, { used, name, componentType }] of components) {
            const isUsed = used?.some(
              (location) =>
                !removedPaths.some((removed) => removed.startsWith(location.absolutePointer))
            );
            if (!isUsed && componentType) {
              removedPaths.push(path);
              rootComponents.push(componentType);
              delete root[componentType]![name];
              lastRemoveCount++;
            }
          }

          data.removedCount += lastRemoveCount;
        } while (lastRemoveCount > 0);

        for (const component of rootComponents) {
          if (isEmptyObject(root[component])) {
            delete root[component];
          }
        }
      },
    },
    NamedSchemas: {
      Schema(schema, { location, key }) {
        if (!schema.allOf) {
          registerComponent(location, 'definitions', key.toString());
        }
      },
    },
    NamedParameters: {
      Parameter(_parameter, { location, key }) {
        registerComponent(location, 'parameters', key.toString());
      },
    },
    NamedResponses: {
      Response(_response, { location, key }) {
        registerComponent(location, 'responses', key.toString());
      },
    },
    NamedSecuritySchemes: {
      SecurityScheme(_securityScheme, { location, key }) {
        registerComponent(location, 'securityDefinitions', key.toString());
      },
    },
  };
};
