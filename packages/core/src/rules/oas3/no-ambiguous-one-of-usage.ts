import { getOwn } from '../../utils.js';
import { dequal } from '../../utils/dequal.js';

import type {
  Oas3Rule,
  Async2Rule,
  Async3Rule,
  Arazzo1Rule,
  Overlay1Rule,
} from '../../visitors.js';
import type { Oas3Schema, Oas3_1Schema } from '../../typings/openapi.js';
import type { UserContext } from '../../walk.js';

type SchemaSignature = {
  properties?: Set<string>;
  type?: string | string[];
  format?: string;
  enum?: unknown[];
  const?: unknown;
  items?: SchemaSignature;
  additionalProperties?: boolean | SchemaSignature;
  required?: Set<string>;
};

export const NoAmbiguousOneOfUsage:
  | Oas3Rule
  | Async2Rule
  | Async3Rule
  | Arazzo1Rule
  | Overlay1Rule = () => {
  // Track oneOf schemas that contain $refs to analyze when refs are resolved
  let oneOfIdCounter = 0;
  const pendingOneOfAnalysis = new Map<
    number,
    {
      schemas: Array<Oas3Schema | Oas3_1Schema>;
      report: UserContext['report'];
      contextPath?: string;
      resolvedCount: number;
      resolvedSchemas: Map<number, Oas3Schema | Oas3_1Schema>;
      refToIndexMap: Map<string, number>;
    }
  >();

  function createSchemaSignature(schema: Oas3Schema | Oas3_1Schema): SchemaSignature {
    const signature: SchemaSignature = {};

    if (schema.type) signature.type = schema.type;
    if (schema.format) signature.format = schema.format;
    if (schema.enum) signature.enum = [...schema.enum];

    // Handle const for OAS 3.1 schemas
    if ('const' in schema && schema.const !== undefined) signature.const = schema.const;

    if (schema.properties) {
      signature.properties = new Set(Object.keys(schema.properties));
    }

    if (schema.required) {
      signature.required = new Set(schema.required);
    }

    if (schema.items && typeof schema.items === 'object') {
      signature.items = createSchemaSignature(schema.items);
    }

    if (schema.additionalProperties !== undefined) {
      if (typeof schema.additionalProperties === 'boolean') {
        signature.additionalProperties = schema.additionalProperties;
      } else {
        signature.additionalProperties = createSchemaSignature(schema.additionalProperties);
      }
    }

    return signature;
  }

  function analyzeResolvedOneOf(
    schemas: Array<Oas3Schema | Oas3_1Schema>,
    report: UserContext['report'],
    contextPath = ''
  ): void {
    if (!Array.isArray(schemas) || schemas.length < 2) return;

    // Only analyze if at least one schema has nullable type
    if (!hasAnyNullableTypes(schemas)) {
      return;
    }

    const signatures: SchemaSignature[] = [];
    const refs = new Set<string>();

    // Collect signatures and check for duplicate refs
    for (let i = 0; i < schemas.length; i++) {
      const schema = schemas[i];

      // Check for duplicate $ref (shouldn't happen with resolved schemas, but keeping for safety)
      const ref = getOwn(schema, '$ref');
      if (typeof ref === 'string') {
        if (refs.has(ref)) {
          report({
            message: `Duplicated schema reference found in oneOf${contextPath}: ${ref}`,
          });
          return;
        }
        refs.add(ref);
      }

      signatures.push(createSchemaSignature(schema));
    }

    // Check for ambiguous combinations
    for (let i = 0; i < signatures.length; i++) {
      for (let j = i + 1; j < signatures.length; j++) {
        if (areSignaturesAmbiguous(signatures[i], signatures[j])) {
          const indexInfo = contextPath ? ` at ${contextPath}` : '';
          report({
            message: `Ambiguous oneOf schemas detected${indexInfo}. Schemas at positions ${i} and ${j} are not mutually exclusive and may match the same data.`,
          });
        }
      }
    }
  }

  function checkOneOfMutualExclusivity(
    schemas: Array<Oas3Schema | Oas3_1Schema>,
    report: UserContext['report'],
    contextPath = ''
  ): void {
    if (!Array.isArray(schemas) || schemas.length < 2) return;

    // Check if there are any $refs in the schemas
    const refIndexes: number[] = [];
    const refToIndexMap = new Map<string, number>();

    for (let i = 0; i < schemas.length; i++) {
      const ref = getOwn(schemas[i], '$ref');
      if (typeof ref === 'string') {
        refIndexes.push(i);
        refToIndexMap.set(ref, i);
      }
    }

    if (refIndexes.length > 0) {
      // If there are $refs, we need to wait for resolution
      const oneOfId = oneOfIdCounter++;
      const analysisData = {
        schemas: [...schemas],
        report,
        contextPath,
        resolvedCount: 0,
        resolvedSchemas: new Map<number, Oas3Schema | Oas3_1Schema>(),
        refToIndexMap,
      };

      pendingOneOfAnalysis.set(oneOfId, analysisData);
      return;
    }

    // No refs, analyze immediately
    analyzeResolvedOneOf(schemas, report, contextPath);

    // Continue recursive checking for nested oneOf
    for (let i = 0; i < schemas.length; i++) {
      const schema = schemas[i];

      // Recursively check nested oneOf
      if (schema.oneOf) {
        checkOneOfMutualExclusivity(schema.oneOf, report, `${contextPath}[${i}].oneOf`);
      }

      // Check oneOf in properties
      if (schema.properties) {
        Object.keys(schema.properties).forEach((propName) => {
          const propSchema = schema.properties![propName];
          if (
            propSchema &&
            typeof propSchema === 'object' &&
            !('$ref' in propSchema) &&
            'oneOf' in propSchema &&
            propSchema.oneOf
          ) {
            checkOneOfMutualExclusivity(
              propSchema.oneOf,
              report,
              `${contextPath}[${i}].properties.${propName}.oneOf`
            );
          }
        });
      }

      // Check oneOf in array items
      if (schema.items && typeof schema.items === 'object' && schema.items.oneOf) {
        checkOneOfMutualExclusivity(schema.items.oneOf, report, `${contextPath}[${i}].items.oneOf`);
      }

      // Check oneOf in additionalProperties
      if (
        schema.additionalProperties &&
        typeof schema.additionalProperties === 'object' &&
        schema.additionalProperties.oneOf
      ) {
        checkOneOfMutualExclusivity(
          schema.additionalProperties.oneOf,
          report,
          `${contextPath}[${i}].additionalProperties.oneOf`
        );
      }
    }
  }

  return {
    Schema: {
      enter(schema: Oas3Schema | Oas3_1Schema, { report }: UserContext) {
        if (!schema.oneOf) return;

        if (!Array.isArray(schema.oneOf)) {
          report({
            message: `Schema object \`oneOf\` must be an array.`,
          });
          return;
        }

        if (schema.oneOf.length < 2) {
          report({
            message: `Schema object \`oneOf\` must have at least 2 items.`,
          });
          return;
        }

        // Check mutual exclusivity
        checkOneOfMutualExclusivity(schema.oneOf, report);
      },
    },

    ref(node, _ctx, resolved) {
      if (!resolved?.node || !node.$ref) return;

      // Check if this ref is part of any pending oneOf analysis
      for (const [oneOfId, analysisData] of pendingOneOfAnalysis.entries()) {
        const schemaIndex = analysisData.refToIndexMap.get(node.$ref);

        if (schemaIndex !== undefined) {
          // Store the resolved schema
          analysisData.resolvedSchemas.set(schemaIndex, resolved.node);
          analysisData.resolvedCount++;

          // If all refs in this oneOf are resolved, analyze it
          if (analysisData.resolvedCount === analysisData.refToIndexMap.size) {
            // Create a new array with resolved schemas
            const resolvedSchemas = analysisData.schemas.map((schema, index) => {
              if (getOwn(schema, '$ref')) {
                return analysisData.resolvedSchemas.get(index) || schema;
              }
              return schema;
            });

            // Analyze the resolved schemas
            analyzeResolvedOneOf(resolvedSchemas, analysisData.report, analysisData.contextPath);

            // Continue recursive checking for the resolved schemas
            for (let i = 0; i < resolvedSchemas.length; i++) {
              const resolvedSchema = resolvedSchemas[i];

              // Recursively check nested oneOf in resolved schemas
              if (resolvedSchema.oneOf) {
                checkOneOfMutualExclusivity(
                  resolvedSchema.oneOf,
                  analysisData.report,
                  `${analysisData.contextPath}[${i}].oneOf`
                );
              }
            }

            // Remove from pending analysis
            pendingOneOfAnalysis.delete(oneOfId);
          }
          break;
        }
      }
    },
  };
};

function hasNullableType(schema: Oas3Schema | Oas3_1Schema): boolean {
  // Check for OAS 3.0 nullable property
  if ('nullable' in schema && schema.nullable === true) {
    return true;
  }

  // Check for OAS 3.1 type array containing null
  if (schema.type && Array.isArray(schema.type)) {
    return schema.type.includes('null');
  }

  return false;
}

function hasAnyNullableTypes(schemas: Array<Oas3Schema | Oas3_1Schema>): boolean {
  return schemas.some(hasNullableType);
}

function areSignaturesAmbiguous(sig1: SchemaSignature, sig2: SchemaSignature): boolean {
  // Check if schemas have overlapping characteristics that make them ambiguous

  // Same type but different formats are not ambiguous
  if (sig1.type && sig2.type && dequal(sig1.type, sig2.type)) {
    if (sig1.format !== sig2.format) return false;
  }

  // Different types are not ambiguous
  if (sig1.type && sig2.type && !dequal(sig1.type, sig2.type)) return false;

  // Const values - if both have const and they're different, not ambiguous
  if (sig1.const !== undefined && sig2.const !== undefined) {
    return dequal(sig1.const, sig2.const);
  }

  // Enum values - if both have enums and they don't overlap, not ambiguous
  if (sig1.enum && sig2.enum) {
    const hasOverlap = sig1.enum.some((val) => sig2.enum!.some((val2) => dequal(val, val2)));
    return hasOverlap;
  }

  // Property overlap check
  if (sig1.properties && sig2.properties) {
    const intersection = [...sig1.properties].filter((prop) => sig2.properties!.has(prop));
    if (intersection.length > 0) {
      // If they share properties, check if required sets make them distinguishable
      if (sig1.required && sig2.required) {
        const requiredIntersection = [...sig1.required].filter((prop) => sig2.required!.has(prop));
        // If they have the same required properties for shared fields, they're ambiguous
        return requiredIntersection.length > 0;
      }
      return true; // Overlapping properties without clear required distinction
    }
  }

  // Array items check
  if (sig1.items && sig2.items) {
    return areSignaturesAmbiguous(sig1.items, sig2.items);
  }

  return false;
}
