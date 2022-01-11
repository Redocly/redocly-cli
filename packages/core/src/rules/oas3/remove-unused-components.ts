import { Oas3Rule } from '../../visitors';
import { Location } from '../../ref-utils';
import { Oas3Components } from '../../typings/openapi'
import { isEmptyObject } from '../../utils';

export const RemoveUnusedComponents: Oas3Rule = () => {
  let components = new Map<string, { used: boolean; componentType?: keyof Oas3Components; name: string }>();

  function registerComponent(location: Location, componentType: keyof Oas3Components, name: string): void {
    components.set(location.absolutePointer, {
      used: components.get(location.absolutePointer)?.used || false,
      componentType,
      name,
    });
  }

  return {
    ref: {
      leave(ref, { type, resolve, key }) {
        if (
          ['Schema', 'Header', 'Parameter', 'Response', 'Example', 'RequestBody'].includes(type.name)
        ) {
          const resolvedRef = resolve(ref);
          if (!resolvedRef.location) return;
          components.set(resolvedRef.location.absolutePointer, {
            used: true,
            name: key.toString(),
          });
        }
      }
    },
    DefinitionRoot: {
      leave(root, ctx) {
        const data = ctx.getVisitorData() as { removedCount: number };
        data.removedCount = 0;

        components.forEach(usageInfo => {
          const { used, componentType, name } = usageInfo;
          if (!used && componentType) {
            let componentChild = root.components![componentType];
            delete componentChild![name];
            data.removedCount++;
            if (isEmptyObject(componentChild)) {
              delete root.components![componentType];
            }
          }
        });
        if (isEmptyObject(root.components)) { delete root.components; }
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
