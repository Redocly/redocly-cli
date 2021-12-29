import { Oas3Rule } from '../../visitors';
import { Location, parsePointer } from '../../ref-utils';
import { Oas3Components } from '../../typings/openapi'
import { isEmptyObject } from '../../utils';

export const RemoveUnusedComponents: Oas3Rule = () => {
  let components = new Map<string, { used: boolean; parent: keyof Oas3Components; name: string }>();

  function registerComponent(location: Location, parent: keyof Oas3Components, name: string): void {
    components.set(location.absolutePointer, {
      used: components.get(location.absolutePointer)?.used || false,
      parent,
      name,
    });
  }

  return {
    ref(ref, { type, resolve, key }) {
      if (
        ['Schema', 'Header', 'Parameter', 'Response', 'Example', 'RequestBody'].includes(type.name)
      ) {
        const resolvedRef = resolve(ref);
        if (!resolvedRef.location) return;
        components.set(resolvedRef.location.absolutePointer, {
          used: true,
          parent: parsePointer(resolvedRef.location.pointer)[1] as keyof Oas3Components,
          name: key.toString(),
        });
      }
    },
    DefinitionRoot: {
      leave(root) {
        components.forEach(usageInfo => {
          const { used, parent, name } = usageInfo;
          if (!used) {
            let componentChild = root.components![parent];
            delete componentChild![name];
            if (isEmptyObject(componentChild)) {
              delete root.components![parent];
            }
          }
        });
        if (isEmptyObject(root.components)) { delete root.components; }
      },
    },
    NamedSchemas: {
      Schema(schema, { location, key }) {
        if (!schema.allOf) {
          registerComponent(
            location,
            parsePointer(location.pointer)[1] as keyof Oas3Components,
            key.toString()
          );
        }
      },
    },
    NamedParameters: {
      Parameter(_parameter, { location, key }) {
        registerComponent(
          location,
          parsePointer(location.pointer)[1] as keyof Oas3Components,
          key.toString()
        );
      },
    },
    NamedResponses: {
      Response(_response, { location, key }) {
        registerComponent(
          location,
          parsePointer(location.pointer)[1] as keyof Oas3Components,
          key.toString()
        );
      },
    },
    NamedExamples: {
      Example(_example, { location, key }) {
        registerComponent(
          location,
          parsePointer(location.pointer)[1] as keyof Oas3Components,
          key.toString()
        );
      },
    },
    NamedRequestBodies: {
      RequestBody(_requestBody, { location, key }) {
        registerComponent(
          location,
          parsePointer(location.pointer)[1] as keyof Oas3Components,
          key.toString()
        );
      },
    },
    NamedHeaders: {
      Header(_header, { location, key }) {
        registerComponent(
          location,
          parsePointer(location.pointer)[1] as keyof Oas3Components,
          key.toString()
        );
      },
    },
  };
};
