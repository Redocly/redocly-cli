import type { Location } from '../../ref-utils.js';
import type { OpenRpc1Rule } from '../../visitors.js';

export const NoUnusedComponents: OpenRpc1Rule = () => {
  const components = new Map<string, { used: boolean; location: Location; name: string }>();

  function registerComponent(location: Location, name: string): void {
    components.set(location.absolutePointer, {
      used: components.get(location.absolutePointer)?.used || false,
      location,
      name,
    });
  }

  return {
    ref(ref, { type, resolve, key, location }) {
      if (
        [
          'Schema',
          'ContentDescriptor',
          'Example',
          'Link',
          'ErrorObject',
          'ExamplePairing',
          'Tag',
        ].includes(type.name)
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
      Schema(schema, { location, key }) {
        if (!schema.allOf) {
          registerComponent(location, key.toString());
        }
      },
    },
    NamedContentDescriptors: {
      ContentDescriptor(_node, { location, key }) {
        registerComponent(location, key.toString());
      },
    },
    NamedExamples: {
      Example(_node, { location, key }) {
        registerComponent(location, key.toString());
      },
    },
    NamedLinks: {
      Link(_node, { location, key }) {
        registerComponent(location, key.toString());
      },
    },
    NamedErrors: {
      ErrorObject(_node, { location, key }) {
        registerComponent(location, key.toString());
      },
    },
    NamedExamplePairingObjects: {
      ExamplePairing(_node, { location, key }) {
        registerComponent(location, key.toString());
      },
    },
    NamedTags: {
      Tag(_node, { location, key }) {
        registerComponent(location, key.toString());
      },
    },
  };
};
