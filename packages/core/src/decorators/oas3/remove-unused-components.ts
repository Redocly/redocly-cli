import { isEmptyObject } from '../../utils';

import type { Location } from '../../ref-utils';
import type { Oas3Decorator } from '../../visitors';
import type { Oas3Components, Oas3Definition } from '../../typings/openapi';

export const RemoveUnusedComponents: Oas3Decorator = () => {
  const components = new Map<
    string,
    { usedIn: Location[]; componentType?: keyof Oas3Components; name: string }
  >();

  function registerComponent(
    location: Location,
    componentType: keyof Oas3Components,
    name: string
  ): void {
    components.set(location.absolutePointer, {
      usedIn: components.get(location.absolutePointer)?.usedIn ?? [],
      componentType,
      name,
    });
  }

  function getBasePath(path: string): string {
    const [fileLocation, localPointer] = path.split('#', 2);
    return `${fileLocation}#${localPointer.split('/').slice(0, 4).join('/')}`;
  }

  function removeCircularDependencies(): void {
    const visited = new Set<string>();
    const stack = new Set<string>();
    const circularDeps = new Set<string>();

    function detectCircularDependencies(path: string): boolean {
      if (stack.has(path)) {
        circularDeps.add(path);
        return true;
      }

      if (visited.has(path)) {
        return false;
      }

      visited.add(path);
      stack.add(path);

      const component = components.get(path);
      if (component) {
        for (const location of component.usedIn) {
          const neighbor = getBasePath(location.absolutePointer);
          if (detectCircularDependencies(neighbor)) {
            return true;
          }
        }
      }

      stack.delete(path);
      return false;
    }

    for (const path of components.keys()) {
      if (!visited.has(path)) {
        stack.clear();
        visited.clear();
        detectCircularDependencies(path);
      }
    }

    for (const path of circularDeps) {
      const component = components.get(path);
      if (component) {
        component.usedIn = component.usedIn.filter(
          (location) => !circularDeps.has(getBasePath(location.absolutePointer))
        );
      }
    }
  }

  function removeUnusedComponents(root: Oas3Definition, removedPaths: string[]): number {
    const removedLengthStart = removedPaths.length;

    for (const [path, { usedIn, name, componentType }] of components) {
      const used = usedIn.some(
        (location) =>
          !removedPaths.some(
            (removed) =>
              location.absolutePointer.startsWith(path) ||
              (location.absolutePointer.startsWith(removed) &&
                (location.absolutePointer.length === removed.length ||
                  location.absolutePointer[removed.length] === '/'))
          )
      );

      if (!used && componentType && root.components) {
        removedPaths.push(path);
        const componentChild = root.components[componentType];
        delete componentChild![name];
        components.delete(path);
        if (isEmptyObject(componentChild)) {
          delete root.components[componentType];
        }
      }
    }

    return removedPaths.length > removedLengthStart
      ? removeUnusedComponents(root, removedPaths)
      : removedPaths.length;
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
          const basePath = getBasePath(location.absolutePointer);

          if (pointer !== basePath) {
            if (registered) {
              registered.usedIn.push(location);
            } else {
              components.set(pointer, {
                usedIn: [location],
                name: key.toString(),
              });
            }
          } else if (!registered) {
            components.set(pointer, {
              usedIn: [],
              name: key.toString(),
            });
          }
        }
      },
    },
    Root: {
      leave(root, ctx) {
        removeCircularDependencies();
        const data = ctx.getVisitorData() as { removedCount: number };

        data.removedCount = removeUnusedComponents(root, []);

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
