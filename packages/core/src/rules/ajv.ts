import addFormats from 'ajv-formats';
import Ajv from '@redocly/ajv/dist/2020.js';
import { escapePointerFragment } from '../ref-utils.js';

import type { ErrorObject, ValidateFunction } from '@redocly/ajv/dist/2020.js';
import type { Location } from '../ref-utils.js';
import type { ResolveFn } from '../walk.js';

let ajvInstance: Ajv | null = null;

export function releaseAjvInstance() {
  ajvInstance = null;
}

function getAjv(resolve: ResolveFn) {
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
      passContext: true,
      loadSchemaSync(base: string, $ref: string, $id: string) {
        const decodedBase = decodeURI(base.split('#')[0]);
        const resolvedRef = resolve({ $ref }, decodedBase);
        if (!resolvedRef || !resolvedRef.location) return false;

        return {
          $id: encodeURI(resolvedRef.location.source.absoluteRef) + '#' + $id,
          ...resolvedRef.node,
        };
      },
      logger: false,
    });
    addFormats(ajvInstance as any); // TODO: fix type mismatch
  }
  return ajvInstance;
}

function getAjvValidator(
  schema: any,
  loc: Location,
  resolve: ResolveFn,
  allowAdditionalProperties: boolean
): ValidateFunction | undefined {
  const ajv = getAjv(resolve);
  const $id = encodeURI(loc.absolutePointer);

  if (!ajv.getSchema($id)) {
    ajv.setDefaultUnevaluatedProperties(allowAdditionalProperties);
    ajv.addSchema({ $id, ...schema }, $id);
  }

  return ajv.getSchema($id);
}

export function validateJsonSchema(
  data: any,
  schema: any,
  schemaLoc: Location,
  instancePath: string,
  resolve: ResolveFn,
  allowAdditionalProperties: boolean,
  ctx: unknown
): { valid: boolean; errors: (ErrorObject & { suggest?: string[] })[] } {
  const validate = getAjvValidator(schema, schemaLoc, resolve, allowAdditionalProperties);
  if (!validate) return { valid: true, errors: [] }; // unresolved refs are reported

  const dataCxt = {
    instancePath,
    parentData: { fake: {} },
    parentDataProperty: 'fake',
    rootData: {},
    dynamicAnchors: {},
  };

  const valid = ctx ? validate.call(ctx, data, dataCxt) : validate(data, dataCxt);

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
      error.instancePath += '/' + escapePointerFragment(property);
    }

    return {
      ...error,
      message,
      suggest,
    };
  }
}
