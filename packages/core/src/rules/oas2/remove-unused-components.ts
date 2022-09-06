import { Oas2Rule } from '../../visitors';
import { Location } from '../../ref-utils';
import { Oas2Components } from '../../typings/swagger';
import { isEmptyObject } from '../../utils';

export const RemoveUnusedComponents: Oas2Rule = () => {
  const components = new Map<
    string,
    { used: boolean; componentType?: keyof Oas2Components; name: string }
  >();

  function registerComponent(
    location: Location,
    componentType: keyof Oas2Components,
    name: string
  ): void {
    components.set(location.absolutePointer, {
      used: components.get(location.absolutePointer)?.used || false,
      componentType,
      name,
    });
  }

  return {
    ref: {
      leave(ref, { type, resolve, key }) {
        if (['Schema', 'Parameter', 'Response', 'SecurityScheme'].includes(type.name)) {
          const resolvedRef = resolve(ref);
          if (!resolvedRef.location) return;
          components.set(resolvedRef.location.absolutePointer, {
            used: true,
            name: key.toString(),
          });
        }
      },
    },
    Root: {
      leave(root, ctx) {
        const data = ctx.getVisitorData() as { removedCount: number };
        data.removedCount = 0;

        const rootComponents = new Set<keyof Oas2Components>();
        components.forEach((usageInfo) => {
          const { used, name, componentType } = usageInfo;
          if (!used && componentType) {
            rootComponents.add(componentType);
            delete root[componentType]![name];
            data.removedCount++;
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
