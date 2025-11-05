import { isEmptyObject } from '../../utils/is-empty-object.js';

import type { Location } from '../../ref-utils.js';
import type { Oas3Decorator } from '../../visitors.js';
import type {
  Oas3Definition,
  Oas3_1Definition,
  Oas3_2Definition,
  Oas3Components,
  Oas3_1Components,
} from '../../typings/openapi.js';

type AnyOas3Definition = Oas3Definition | Oas3_1Definition | Oas3_2Definition;

export const RemoveUnusedComponents: Oas3Decorator = () => {
  const components = new Map<
    string,
    {
      usedIn: Location[];
      componentType?: keyof (Oas3Components | Oas3_1Components);
      name: string;
    }
  >();

  function registerComponent(
    location: string | Location,
    componentType: keyof (Oas3Components | Oas3_1Components),
    name: string
  ): void {
    const locPointer = typeof location === 'string' ? location : location.absolutePointer;
    components.set(locPointer, {
      usedIn: components.get(locPointer)?.usedIn ?? [],
      componentType,
      name,
    });
  }

  function isComponentUsed(
    usedIn: Location[],
    componentType: keyof (Oas3Components | Oas3_1Components) | undefined,
    removedPaths: string[]
  ): boolean {
    if (componentType === 'securitySchemes') {
      return usedIn.length > 0;
    }

    return usedIn.some(
      (location) =>
        !removedPaths.some(
          (removed) =>
            location.absolutePointer.startsWith(removed) &&
            (location.absolutePointer.length === removed.length ||
              location.absolutePointer[removed.length] === '/')
        )
    );
  }

  function removeUnusedComponents(root: AnyOas3Definition, removedPaths: string[]): number {
    const removedLengthStart = removedPaths.length;

    for (const [path, { usedIn, name, componentType }] of components) {
      const used = isComponentUsed(usedIn, componentType, removedPaths);

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
        const supportedRefTypes = [
          'Schema',
          'Header',
          'Parameter',
          'Response',
          'Example',
          'RequestBody',
        ];
        if (!supportedRefTypes.includes(type.name)) return;

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
    SecurityRequirement(securityRequirement, { key }) {
      registerComponent(Object.keys(securityRequirement)[0], 'securitySchemes', key.toString());
    },
    NamedSecuritySchemes: {
      SecurityScheme(_securityScheme, { location, key }) {
        if (components.has(key.toString())) {
          components.get(key.toString())!.usedIn.push(location);
        } else {
          registerComponent(location, 'securitySchemes', key.toString());
        }
      },
    },
  };
};
