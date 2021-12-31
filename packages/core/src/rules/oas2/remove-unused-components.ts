import { Oas2Rule } from '../../visitors';
import { Location, parsePointer } from '../../ref-utils';
import { Oas2Components } from '../../typings/swagger';
import { isEmptyObject } from '../../utils';

export const RemoveUnusedComponents: Oas2Rule = () => {
  let components = new Map<string, { used: boolean; componentType?: keyof Oas2Components; name: string }>();

  function registerComponent(location: Location, componentType: keyof Oas2Components, name: string): void {
    components.set(location.absolutePointer, {
      used: components.get(location.absolutePointer)?.used || false,
      componentType,
      name,
    });
  }

  return {
    ref(ref, { type, resolve, key }) {
      if (
        ['Schema', 'Parameter', 'Response', 'SecurityScheme'].includes(type.name)
      ) {
        const resolvedRef = resolve(ref);
        if (!resolvedRef.location) return;
        components.set(resolvedRef.location.absolutePointer, {
          used: true,
          name: key.toString(),
        });
      }
    },

    DefinitionRoot: {
      leave(root) {
        let rootComponents = new Set<keyof Oas2Components>();
        components.forEach(usageInfo => {
          const { used, name, componentType } = usageInfo;
          if (!used && componentType) {
            rootComponents.add(componentType);
            delete root[componentType]![name];
          }
        });
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
          registerComponent(
            location,
            parsePointer(location.pointer)[0] as keyof Oas2Components,
            key.toString()
          );
        }
      },
    },
    NamedParameters: {
      Parameter(_parameter, { location, key }) {
        registerComponent(
          location,
          parsePointer(location.pointer)[0] as keyof Oas2Components,
          key.toString()
        );
      },
    },
    NamedResponses: {
      Response(_response, { location, key }) {
        registerComponent(
          location,
          parsePointer(location.pointer)[0] as keyof Oas2Components,
          key.toString()
        );
      },
    },
    NamedSecuritySchemes: {
      SecurityScheme(_securityScheme, { location, key }) {
        registerComponent(
          location,
          parsePointer(location.pointer)[0] as keyof Oas2Components,
          key.toString()
        );
      },
    }
  };
};
