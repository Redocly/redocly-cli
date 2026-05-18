import { isRef, type Location } from '../../ref-utils.js';
import type { Oas3_1Schema, Oas3Schema } from '../../typings/openapi.js';
import type { Oas3Rule } from '../../visitors.js';

type ComponentInfo = {
  used: boolean;
  location: Location;
  name: string;
  referencesDiscriminator?: boolean;
};

export const NoUnusedComponents: Oas3Rule = () => {
  const components = new Map<string, ComponentInfo>();

  function registerComponent(
    location: Location,
    name: string,
    referencesDiscriminator: boolean = false
  ): void {
    components.set(location.absolutePointer, {
      used: components.get(location.absolutePointer)?.used || false,
      referencesDiscriminator,
      location,
      name,
    });
  }

  return {
    ref(ref, { type, resolve, key, location }) {
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
          if (!usageInfo.used && !usageInfo.referencesDiscriminator) {
            report({
              message: `Component: "${usageInfo.name}" is never used.`,
              location: usageInfo.location.key(),
              reference: 'https://redocly.com/docs/cli/rules/oas/no-unused-components',
            });
          }
        });
      },
    },
    NamedSchemas: {
      Schema(schema, { location, key, resolve }) {
        const referencesDiscriminator = schema.allOf?.some(
          (ref) => isRef(ref) && resolve<Oas3Schema | Oas3_1Schema>(ref)?.node?.discriminator
        );
        registerComponent(location, key.toString(), referencesDiscriminator);
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
    NamedMediaTypes: {
      MediaTypesMap(_mediaTypesMap, { location, key }) {
        registerComponent(location, key.toString());
      },
    },
  };
};
