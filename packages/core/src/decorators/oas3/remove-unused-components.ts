import type { Location } from '../../ref-utils.js';
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

export const RemoveUnusedComponents: Oas3Decorator = () => {
  const components = new Map<
    string,
    {
      usedIn: Location[];
      componentType?: AnyOas3ComponentsKey;
      name: string;
    }
  >();

  function registerComponent(
    location: Location,
    componentType: AnyOas3ComponentsKey,
    name: string
  ): void {
    components.set(location.absolutePointer, {
      usedIn: components.get(location.absolutePointer)?.usedIn ?? [],
      componentType,
      name,
    });
  }

  function removeUnusedComponents(root: AnyOas3Definition, removedPaths: string[]): number {
    const removedLengthStart = removedPaths.length;

    for (const [path, { usedIn, name, componentType }] of components) {
      const used = usedIn.some(
        (location) =>
          !removedPaths.some(
            (removed) =>
              location.absolutePointer.startsWith(removed) &&
              (location.absolutePointer.length === removed.length ||
                location.absolutePointer[removed.length] === '/')
          )
      );

      if (
        !used &&
        componentType &&
        root.components &&
        hasComponent(root.components, componentType)
      ) {
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
          const resolvedRef = resolve(ref);
          if (!resolvedRef.location) return;

          const [fileLocation, localPointer] = resolvedRef.location.absolutePointer.split('#', 2);
          if (!localPointer) return;

          const componentLevelLocalPointer = localPointer.split('/').slice(0, 4).join('/');
          const pointer = `${fileLocation}#${componentLevelLocalPointer}`;

          const registered = components.get(pointer);

          if (registered) {
            registered.usedIn.push(location);
          } else {
            components.set(pointer, {
              usedIn: [location],
              name: key.toString(),
            });
          }
        }
      },
    },
    Root: {
      leave(root, ctx) {
        const data = ctx.getVisitorData() as { removedCount: number };
        data.removedCount = removeUnusedComponents(root, []);

        if (isEmptyObject(root.components)) {
          delete root.components;
        }
      },
    },
    NamedSchemas: {
      Schema(schema, { rawLocation, key }) {
        if (!schema.allOf) {
          registerComponent(rawLocation, 'schemas', key.toString());
        }
      },
    },
    NamedParameters: {
      Parameter(_parameter, { rawLocation, key }) {
        registerComponent(rawLocation, 'parameters', key.toString());
      },
    },
    NamedResponses: {
      Response(_response, { rawLocation, key }) {
        registerComponent(rawLocation, 'responses', key.toString());
      },
    },
    NamedExamples: {
      Example(_example, { rawLocation, key }) {
        registerComponent(rawLocation, 'examples', key.toString());
      },
    },
    NamedRequestBodies: {
      RequestBody(_requestBody, { rawLocation, key }) {
        registerComponent(rawLocation, 'requestBodies', key.toString());
      },
    },
    NamedHeaders: {
      Header(_header, { rawLocation, key }) {
        registerComponent(rawLocation, 'headers', key.toString());
      },
    },
    NamedMediaTypes: {
      MediaTypesMap(_mediaTypesMap, { rawLocation, key }) {
        registerComponent(rawLocation, 'mediaTypes', key.toString());
      },
    },
  };
};
