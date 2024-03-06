import { Location } from '../../ref-utils';
import { isEmptyObject } from '../../utils';

import type { Oas3Decorator } from '../../visitors';
import type { Oas3Components } from '../../typings/openapi';

export const RemoveUnusedComponents: Oas3Decorator = () => {
  const components = new Map<
    string,
    { used: null | Location[]; componentType?: keyof Oas3Components; name: string }
  >();

  function registerComponent(
    location: Location,
    componentType: keyof Oas3Components,
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
        if (
          ['Schema', 'Header', 'Parameter', 'Response', 'Example', 'RequestBody'].includes(
            type.name
          )
        ) {
          const resolvedRef = resolve(ref);
          if (!resolvedRef.location) return;

          const [fileLocation, localPointer] = resolvedRef.location.absolutePointer.split('#', 2);
          const componentLevelLocalPointer = localPointer.split('/').slice(0, 4).join('/');
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

        let lastRemoveCount = 0;
        do {
          lastRemoveCount = 0
          for (const [path, { used, name, componentType }] of components) {
            const isUsed = used?.some(
              (location) =>
                !removedPaths.some((removed) => removed.startsWith(location.absolutePointer))
            );

            if (!isUsed && componentType && root.components) {
              removedPaths.push(path);
              const componentChild = root.components[componentType];
              delete componentChild![name];
              lastRemoveCount++;
              if (isEmptyObject(componentChild)) {
                delete root.components[componentType];
              }
            }

            data.removedCount += lastRemoveCount;
          }
        } while (lastRemoveCount > 0);

        if (isEmptyObject(root.components)) {
          delete root.components;
        }
      },
    },
    NamedSchemas: {
      Schema(schema, { location, key }) {
        if (!schema.allOf) {
          registerComponent(location, 'schemas', key.toString());
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
    NamedExamples: {
      Example(_example, { location, key }) {
        registerComponent(location, 'examples', key.toString());
      },
    },
    NamedRequestBodies: {
      RequestBody(_requestBody, { location, key }) {
        registerComponent(location, 'requestBodies', key.toString());
      },
    },
    NamedHeaders: {
      Header(_header, { location, key }) {
        registerComponent(location, 'headers', key.toString());
      },
    },
  };
};
