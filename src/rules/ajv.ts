import * as Ajv from 'ajv';
import * as jsonSpecV4 from 'ajv/lib/refs/json-schema-draft-04.json';
import { OasVersion } from '../validate';
import { Location } from '../ref-utils';
import { Referenced } from '../typings/openapi';

const ajvInstances: Partial<Record<OasVersion, Ajv.Ajv>> = {};
const ajvValidatorFns: WeakMap<any, Ajv.ValidateFunction> = new WeakMap();

function getAjv(oasVersion: OasVersion) {
  if (!ajvInstances[oasVersion]) {
    ajvInstances[oasVersion] = new Ajv({
      schemaId: 'auto',
      meta: true,
      allErrors: false,
      jsonPointers: true,
      unknownFormats: 'ignore',
      nullable: true,
      missingRefs: 'ignore',
      validateSchema: false,
      // logger: false
    });

    ajvInstances[oasVersion]!.addMetaSchema(jsonSpecV4);
  }

  return ajvInstances[oasVersion]!;
}

function getAjvValidator(schema: any, oasVersion: OasVersion): Ajv.ValidateFunction {
  if (!ajvValidatorFns.get(schema)) {
    const inst = getAjv(oasVersion);
    ajvValidatorFns.set(schema, inst?.compile(schema));
  }

  return ajvValidatorFns.get(schema)!;
}

export function validateSchema(
  data: any,
  schema: any,
  location: Location,
  resolve: (
    node: Referenced<any>,
  ) => { location: Location; node: any } | { location: undefined; node: undefined },
  oasVersion: OasVersion,
):
  | {
      valid: true;
      error: undefined;
    }
  | { valid: false; error: Ajv.ErrorObject } {

  // FIXME: PoC, should be rewritten
  function resolveDeep(node:any) {
    if (node.$ref) {
      return resolve(schema).node
    }
    if (node.items && node.items.$ref) {
      return {
        ...node,
        items: resolve(node.items).node
      }
    }
    return node;
  }


  const validator = getAjvValidator(resolveDeep(schema), oasVersion);

  const valid = !!validator(data, location.pointer);
  if (valid) {
    return {
      valid: true,
      error: undefined
    };
  } else {
    return {
      valid: false,
      error: validator.errors?.[0]!,
    };
  }
}
