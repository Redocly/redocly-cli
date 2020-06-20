import { OAS3Rule } from '../../visitors';
import { Location } from '../../ref';

export const NoUnusedComponents: OAS3Rule = () => {
  let components = new Map<string, { used: boolean; location?: Location; name: string }>();

  function registerComponent(location: Location, name: string): void {
    components.set(location.absolutePointer, {
      used: components.get(location.absolutePointer)?.used || false,
      location,
      name,
    });
  }

  return {
    ref(ref, { location, type, resolve, key }) {
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
    },
    DefinitionRoot: {
      leave(root, { report, location }) {
        components.forEach((usageInfo, absolutePointer) => {
          if (!usageInfo.used) {
            const componentName = absolutePointer.split('/').pop();
            report({
              message: `Component: "${componentName}" is never used.`,
              location: { ...usageInfo.location, reportOnKey: true },
            });
          }
        });
      },
    },
    NamedSchemasMap: {
      Schema(schema, { location, key }) {
        // FIXME: find a better way to detect possible discriminator
        if (!schema.allOf) {
          registerComponent(location, key.toString());
        }
      },
    },
    Components: {
      Parameter(_parameter, { location, key }) {
        registerComponent(location, key.toString());
      },
      Response(_response, { location, key }) {
        registerComponent(location, key.toString());
      },
      Example(_example, { location, key }) {
        registerComponent(location, key.toString());
      },
      RequestBody(_requestBody, { location, key }) {
        registerComponent(location, key.toString());
      },
      Header(_header, { location, key }) {
        // FIXME: fix triggering on headers inside ReuquestyBody
        registerComponent(location, key.toString());
      },
    },
  };
};
