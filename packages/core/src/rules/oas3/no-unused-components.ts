import { Oas3Rule } from '../../visitors';
import { Location } from '../../ref-utils';

export const NoUnusedComponents: Oas3Rule = () => {
  const components = new Map<string, { used: boolean; location: Location; name: string }>();

  function registerComponent(location: Location, name: string, used = false): void {
    components.set(location.absolutePointer, {
      used: components.get(location.absolutePointer)?.used || used,
      location,
      name,
    });
  }

  return {
    ref(ref, { type, resolve, key, location }) {
      if (
        ['Schema', 'Header', 'Parameter', 'Response', 'Example', 'RequestBody'].includes(type.name)
      ) {
        const resolvedRef = resolve(ref);
        if (!resolvedRef.location) return;
        components.set(resolvedRef.location.absolutePointer, {
          used: true,
          name: key.toString(),
          location,
        });
      }
    },
    Root: {
      leave(_, { report }) {
        components.forEach((usageInfo) => {
          if (!usageInfo.used) {
            report({
              message: `Component: "${usageInfo.name}" is never used.`,
              location: usageInfo.location.key(),
            });
          }
        });
      },
    },
    NamedSchemas: {
      Schema(schema, { location, key, resolve }) {
        registerComponent(
          location,
          key.toString(),
          schema.allOf && schema.allOf.some((v) => v.$ref && resolve(v).node?.discriminator)
        );
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
    },
    NamedExamples: {
      Example(_example, { location, key }) {
        registerComponent(location, key.toString());
      },
    },
    NamedRequestBodies: {
      RequestBody(_requestBody, { location, key }) {
        registerComponent(location, key.toString());
      },
    },
    NamedHeaders: {
      Header(_header, { location, key }) {
        registerComponent(location, key.toString());
      },
    },
  };
};
