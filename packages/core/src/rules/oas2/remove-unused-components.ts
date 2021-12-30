import { Oas2Rule } from '../../visitors';
import { Location } from '../../ref-utils';
import { isEmptyObject } from '../../utils';

export const RemoveUnusedComponents: Oas2Rule = () => {
  let definitions = new Map<string, { used: boolean; name: string }>();

  function registerComponent(location: Location, name: string): void {
    definitions.set(location.absolutePointer, {
      used: definitions.get(location.absolutePointer)?.used || false,
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
        definitions.set(resolvedRef.location.absolutePointer, {
          used: true,
          name: key.toString(),
        });
      }
    },
    DefinitionRoot: {
      leave(root) {
        definitions.forEach(usageInfo => {
          const { used, name } = usageInfo;
          if (!used) { delete root.definitions![name]; }
        });
        if (isEmptyObject(root.definitions)) { delete root.definitions; }
      },
    },
    NamedSchemas: {
      Schema(schema, { location, key }) {
        if (!schema.allOf) {
          registerComponent(location, key.toString());
        }
      },
    },
    NamedParameters: {
      Parameter(_parameter, { location, key }) {
        registerComponent(location, key.toString());
      },
    },
    NamedResponses: {
      Response(_response, { location, key }) {
        registerComponent(location, key.toString());
      },
    }
  };
};
