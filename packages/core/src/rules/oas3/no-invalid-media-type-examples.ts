import { isRef } from '../../ref-utils.js';
import { validateExample } from '../utils.js';

import type { Oas3Rule } from '../../visitors.js';
import type { Location } from '../../ref-utils.js';
import type { Oas3_1Schema, Oas3Example, Oas3Schema } from '../../typings/openapi.js';
import type { UserContext } from '../../walk.js';

export const ValidContentExamples: Oas3Rule = (opts) => {
  return {
    MediaType: {
      leave(mediaType, ctx: UserContext) {
        const { location, resolve } = ctx;
        if (!mediaType.schema) return;
        if (mediaType.example !== undefined) {
          resolveAndValidateExample(mediaType.example, location.child('example'), location);
        } else if (mediaType.examples) {
          for (const exampleName of Object.keys(mediaType.examples)) {
            resolveAndValidateExample(
              mediaType.examples[exampleName],
              location.child(['examples', exampleName, 'value']),
              location,
              true
            );
          }
        }

        function resolveAndValidateExample(
          example: Oas3Example | any,
          exampleLocation: Location,
          mediaTypeLocation: Location,
          isMultiple?: boolean
        ) {
          if (isRef(example)) {
            const resolved = resolve<Oas3Example>(example);
            if (!resolved.location) return;
            exampleLocation = isMultiple ? resolved.location.child('value') : resolved.location;
            example = resolved.node;
          }
          if (isMultiple && typeof example?.value === 'undefined') {
            return;
          }

          const resolvedSchema = ensureSchemaIsResolved(mediaType.schema!, ctx);
          if (!resolvedSchema) return;
          const modifiedSchema = modifyRequiredProperties(resolvedSchema, mediaTypeLocation);

          validateExample(
            isMultiple ? example.value : example,
            modifiedSchema,
            exampleLocation,
            ctx,
            !!opts.allowAdditionalProperties
          );
        }
      },
    },
  };
};

function ensureSchemaIsResolved(
  schema: Oas3Schema | Oas3_1Schema,
  ctx: UserContext,
  from?: string,
  visited: Set<string> = new Set()
): Oas3Schema | Oas3_1Schema | undefined {
  if (!isRef(schema) || visited.has(schema.$ref)) {
    return schema;
  }
  visited.add(schema.$ref);

  const { resolve } = ctx;

  const resolved = resolve<Oas3Schema | Oas3_1Schema>(schema, from);
  if (!resolved.location) {
    return;
  }
  if (!resolved.node.properties) {
    return resolved.node;
  }

  const clonedNode = structuredClone(resolved.node);
  if (clonedNode.properties) {
    for (const [key, value] of Object.entries(clonedNode.properties)) {
      if (isRef(value)) {
        const nestedResolvedSchema = ensureSchemaIsResolved(
          value,
          ctx,
          resolved.location?.source.absoluteRef,
          visited
        );
        if (nestedResolvedSchema) {
          clonedNode.properties[key] = nestedResolvedSchema;
        } else {
          return;
        }
      }
    }
  }

  return clonedNode;
}

function isRequestExample(mediaTypeLocation: Location): boolean {
  return (
    mediaTypeLocation.pointer.includes('/components/requestBodies') ||
    /paths\/[^/]+\/[^/]+\/requestBody/.test(mediaTypeLocation.pointer)
  );
}

function isResponseExample(mediaTypeLocation: Location): boolean {
  return (
    mediaTypeLocation.pointer.includes('/components/responses') ||
    /paths\/[^/]+\/[^/]+\/responses/.test(mediaTypeLocation.pointer)
  );
}

function modifyRequiredProperties(
  resolvedSchema: Oas3Schema | Oas3_1Schema,
  mediaTypeLocation: Location
): Oas3Schema | Oas3_1Schema {
  if (resolvedSchema.allOf || resolvedSchema.anyOf || resolvedSchema.oneOf) {
    // Skip allOf/oneOf/anyOf as it's complicated to validate it right now.
    // We need core support for checking constraints through those keywords.
    return resolvedSchema;
  }

  if (!resolvedSchema.required || !resolvedSchema.properties) {
    return resolvedSchema;
  }

  // If performance gets an issue, we can check readonly/writeonly properties first before cloning the schema.
  const clonedSchema = structuredClone(resolvedSchema);
  const properties = clonedSchema.properties!;
  const required = clonedSchema.required!;

  for (const property of Object.keys(properties)) {
    if (!required.includes(property)) {
      continue;
    }
    // This type cast is safe because `ensureSchemaIsResolved` resolves all $refs in properties.
    const propVal = properties[property] as Oas3Schema | Oas3_1Schema;

    if (
      (propVal.readOnly && isRequestExample(mediaTypeLocation)) ||
      (propVal.writeOnly && isResponseExample(mediaTypeLocation))
    ) {
      clonedSchema.required = required.filter((requiredProp) => requiredProp !== property);
      delete clonedSchema.properties![property];
    }
  }

  return clonedSchema;
}
