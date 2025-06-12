import Ajv from '@redocly/ajv/dist/2020.js';
import { escapePointer } from '../ref-utils.js';

import type { Location } from '../ref-utils.js';
import type { ValidateFunction, ErrorObject } from '@redocly/ajv/dist/2020.js';
import type { ResolveFn } from '../walk.js';

// Use per-resolve-function AJV instances to prevent race conditions
const ajvInstanceCache = new WeakMap<ResolveFn, Ajv>();

function getAjv(resolve: ResolveFn, allowAdditionalProperties: boolean) {
  let ajvInstance = ajvInstanceCache.get(resolve);
  
  if (!ajvInstance) {
    ajvInstance = new Ajv({
      schemaId: '$id',
      meta: true,
      allErrors: true,
      strictSchema: false,
      inlineRefs: false,
      validateSchema: false,
      discriminator: true,
      allowUnionTypes: true,
      validateFormats: false, // TODO: fix it
      defaultUnevaluatedProperties: allowAdditionalProperties,
      loadSchemaSync(base: string, $ref: string, $id: string) {
        const resolvedRef = resolve({ $ref }, base.split('#')[0]);
        if (!resolvedRef || !resolvedRef.location) return false;
        return { $id: resolvedRef.location.source.absoluteRef + '#' + $id, ...resolvedRef.node };
      },
      logger: false,
    });
    
    ajvInstanceCache.set(resolve, ajvInstance);
  }
  return ajvInstance;
}

function getAjvValidator(
  schema: any,
  loc: Location,
  resolve: ResolveFn,
  allowAdditionalProperties: boolean
): ValidateFunction | undefined {
  const ajv = getAjv(resolve, allowAdditionalProperties);

  const schemaId = loc.absolutePointer;
  if (!ajv.getSchema(schemaId)) {
    try {
      ajv.addSchema({ $id: schemaId, ...schema }, schemaId);
    } catch (error) {
      // Handle concurrent schema registration
      if (!error.message.includes('schema with key or id') && !ajv.getSchema(schemaId)) {
        throw error;
      }
    }
  }

  return ajv.getSchema(schemaId);
}

export function validateJsonSchema(
  data: any,
  schema: any,
  schemaLoc: Location,
  instancePath: string,
  resolve: ResolveFn,
  allowAdditionalProperties: boolean
): { valid: boolean; errors: (ErrorObject & { suggest?: string[] })[] } {
  const validate = getAjvValidator(schema, schemaLoc, resolve, allowAdditionalProperties);
  if (!validate) return { valid: true, errors: [] }; // unresolved refs are reported

  const valid = validate(data, {
    instancePath,
    parentData: { fake: {} },
    parentDataProperty: 'fake',
    rootData: {},
    dynamicAnchors: {},
  });

  return {
    valid: !!valid,
    errors: (validate.errors || []).map(beatifyErrorMessage),
  };

  function beatifyErrorMessage(error: ErrorObject) {
    let message = error.message;
    const suggest = error.keyword === 'enum' ? error.params.allowedValues : undefined;
    if (suggest) {
      message += ` ${suggest.map((e: any) => `"${e}"`).join(', ')}`;
    }

    if (error.keyword === 'type') {
      message = `type ${message}`;
    }

    const relativePath = error.instancePath.substring(instancePath.length + 1);
    const propName = relativePath.substring(relativePath.lastIndexOf('/') + 1);
    if (propName) {
      message = `\`${propName}\` property ${message}`;
    }
    if (error.keyword === 'additionalProperties' || error.keyword === 'unevaluatedProperties') {
      const property = error.params.additionalProperty || error.params.unevaluatedProperty;
      message = `${message} \`${property}\``;
      error.instancePath += '/' + escapePointer(property);
    }

    return {
      ...error,
      message,
      suggest,
    };
  }
}
