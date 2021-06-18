import Ajv, { ValidateFunction, ErrorObject } from '@redocly/ajv';
// import { AnyValidateFunction } from '@redocly/ajv/dist/core';
// import * as jsonSpecV4 from 'ajv/lib/refs/json-schema-draft-04.json';
// import { OasVersion } from '../validate';
import { Location, escapePointer } from '../ref-utils';
import { ResolveFn } from '../walk';

let ajvInstance: Ajv | null = null;

export function releaseAjvInstance() {
  ajvInstance = null;
}

function getAjv(resolve: ResolveFn<any>, disallowAdditionalProperties: boolean) {
  if (!ajvInstance) {
    ajvInstance = new Ajv({
      // schemaId: '$id',
      meta: true,
      allErrors: true,
      // jsonPointers: true,
      // unknownFormats: 'ignore',
      // nullable: true,
      // missingRefs: 'ignore',
      inlineRefs: false,
      validateSchema: false,
      defaultAdditionalProperties: !disallowAdditionalProperties,
      loadSchemaSync(base: string, $ref: string, $id: string) {
        debugger
        const resolvedRef = resolve({ $ref }, base.replace(/#$/, ''));
        if (!resolvedRef || !resolvedRef.location) return undefined;
        return { $id, ...resolvedRef.node };
      },
      logger: false,
    });
  }
  return ajvInstance;
}

function getAjvValidator(
  schema: any,
  loc: Location,
  resolve: ResolveFn<any>,
  disallowAdditionalProperties: boolean,
): ValidateFunction | undefined {
  const ajv = getAjv(resolve, disallowAdditionalProperties);

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
  resolve: ResolveFn<any>,
  disallowAdditionalProperties: boolean,
): { valid: boolean; errors: (ErrorObject & { suggest?: string[] })[] } {
  const validate = getAjvValidator(schema, schemaLoc, resolve, disallowAdditionalProperties);
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
    let suggest =
      error.keyword === 'enum' ? error.params.allowedValues : undefined;
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
    if (error.keyword === 'additionalProperties') {
      const property = error.params.additionalProperty;
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
