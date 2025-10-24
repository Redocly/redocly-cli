import addFormats from 'ajv-formats';
import Ajv from '@redocly/ajv/dist/2020.js';
import AjvDraft04 from 'ajv-draft-04';
import { escapePointer } from '../ref-utils.js';

import type { Location } from '../ref-utils.js';
import type { ValidateFunction, ErrorObject } from '@redocly/ajv/dist/2020.js';
import type { ResolveFn } from '../walk.js';

let ajvInstance: Ajv | null = null;
let ajvDraft04Instance: AjvDraft04 | null = null;

export function releaseAjvInstance() {
  ajvInstance = null;
  ajvDraft04Instance = null;
}

function getAjv(resolve: ResolveFn, allowAdditionalProperties: boolean) {
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
      validateFormats: true,
      defaultUnevaluatedProperties: allowAdditionalProperties,
      loadSchemaSync(base: string, $ref: string, $id: string) {
        const resolvedRef = resolve({ $ref }, base.split('#')[0]);
        if (!resolvedRef || !resolvedRef.location) return false;
        return { $id: resolvedRef.location.source.absoluteRef + '#' + $id, ...resolvedRef.node };
      },
      logger: false,
    });
    addFormats(ajvInstance as any); // TODO: fix type mismatch
  }
  return ajvInstance;
}

function getAjvDraft04(resolve: ResolveFn, allowAdditionalProperties: boolean) {
  if (!ajvDraft04Instance) {
    ajvDraft04Instance = new AjvDraft04({
      schemaId: 'id',
      meta: false,
      allErrors: true,
      strictSchema: false,
      inlineRefs: true,
      validateSchema: false,
      discriminator: true,
      allowUnionTypes: true,
      validateFormats: true,
      logger: false,
      defaultAdditionalProperties: allowAdditionalProperties,
      loadSchemaSync(base, $ref, id) {
        const resolvedRef = resolve({ $ref }, base.split('#')[0]);
        if (!resolvedRef || !resolvedRef.location) return false;
        return { $id: resolvedRef.location.source.absoluteRef + '#' + id, ...resolvedRef.node };
      },
    });
    addFormats(ajvDraft04Instance as any);
  }

  return ajvDraft04Instance;
}

function getAjvValidator(
  schema: any,
  loc: Location,
  resolve: ResolveFn,
  allowAdditionalProperties: boolean
): ValidateFunction | undefined {
  const ajv = getAjv(resolve, allowAdditionalProperties);

  if (!ajv.getSchema(loc.absolutePointer)) {
    ajv.addSchema({ $id: loc.absolutePointer, ...schema }, loc.absolutePointer);
  }

  return ajv.getSchema(loc.absolutePointer);
}

function getAjvDraft04Validator(
  schema: any,
  loc: Location,
  resolve: ResolveFn,
  allowAdditionalProperties: boolean
): ValidateFunction | undefined {
  const ajv = getAjvDraft04(resolve, allowAdditionalProperties);

  if (!ajv.getSchema(loc.absolutePointer)) {
    ajv.addSchema({ $id: loc.absolutePointer, ...schema }, loc.absolutePointer);
  }

  return ajv.getSchema(loc.absolutePointer);
}

export function validateJsonSchema(
  data: any,
  schema: any,
  schemaLoc: Location,
  instancePath: string,
  resolve: ResolveFn,
  allowAdditionalProperties: boolean,
  specVersion: string = 'oas3_1'
): { valid: boolean; errors: (ErrorObject & { suggest?: string[] })[] } {
  const validate =
    specVersion === 'oas3_0' || specVersion === 'oas2'
      ? getAjvDraft04Validator(schema, schemaLoc, resolve, allowAdditionalProperties)
      : getAjvValidator(schema, schemaLoc, resolve, allowAdditionalProperties);

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
