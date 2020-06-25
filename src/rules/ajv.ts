import * as Ajv from 'ajv';
// import * as jsonSpecV4 from 'ajv/lib/refs/json-schema-draft-04.json';
// import { OasVersion } from '../validate';
import { Location, isRef } from '../ref-utils';
import { Referenced } from '../typings/openapi';

const ajvInstances: Partial<Record<string, Ajv.Ajv>> = {};
const ajvValidatorFns: WeakMap<any, Ajv.ValidateFunction> = new WeakMap();

function getAjv(file: string, resolve: any) {
  if (!ajvInstances[file]) {
    ajvInstances[file] = new Ajv({
      schemaId: 'auto',
      meta: true,
      allErrors: false,
      jsonPointers: true,
      unknownFormats: 'ignore',
      nullable: true,
      missingRefs: 'ignore',
      validateSchema: false,
      loadSchemaSync: ($ref) => {
        return resolve({$ref}).node;
      }
      // logger: false
    });

    // ajvInstances[oasVersion]!.addMetaSchema(jsonSpecV4);
  }

  return ajvInstances[file]!;
}

function getAjvValidator(schema: any, file: string, resolve: any): Ajv.ValidateFunction {
  if (isRef(schema)) {
    schema = resolve(schema).node;
  }

  if (!ajvValidatorFns.get(schema)) {
    const inst = getAjv(file, resolve);
    ajvValidatorFns.set(schema, inst?.compileSync(schema));
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
):
  | {
      valid: true;
      error: undefined;
    }
  | { valid: false; error: Ajv.ErrorObject } {

  const { node, location: newLoc } = resolve(schema);
  const validator = getAjvValidator(node, newLoc!.source.absoluteRef, resolve);

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
