import * as Ajv from '@redocly/ajv';
// import * as jsonSpecV4 from 'ajv/lib/refs/json-schema-draft-04.json';
// import { OasVersion } from '../validate';
import { Location, escapePointer } from '../ref-utils';
import { ResolveFn } from '../walk';

let ajvInstance: Ajv.Ajv | null = null;

export function releaseAjvInstance() {
  ajvInstance = null;
}

function getAjv(resolve: ResolveFn<any>, disallowAdditionalProperties: boolean) {
  if (!ajvInstance) {
    ajvInstance = new Ajv({
      schemaId: 'auto',
      meta: true,
      allErrors: true,
      jsonPointers: true,
      unknownFormats: 'ignore',
      nullable: true,
      missingRefs: 'ignore',
      inlineRefs: false,
      validateSchema: false,
      defaultAdditionalProperties: !disallowAdditionalProperties,
      loadSchemaSync(base: string, $ref: string, id: string) {
        const resolvedRef = resolve({$ref}, base.replace(/#$/, ''));
        if (!resolvedRef || !resolvedRef.location) return undefined;
        return { id, ...resolvedRef.node };
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
): Ajv.ValidateFunction | undefined {
  const ajv = getAjv(resolve, disallowAdditionalProperties);

  if (!ajv.getSchema(loc.absolutePointer)) {
    ajv.addSchema({ id: loc.absolutePointer, ...schema }, loc.absolutePointer);
  }

  return ajv.getSchema(loc.absolutePointer);
}

export function validateJsonSchema(
  data: any,
  schema: any,
  schemaLoc: Location,
  dataPath: string,
  resolve: ResolveFn<any>,
  disallowAdditionalProperties: boolean,
): { valid: boolean; errors: (Ajv.ErrorObject & { suggest?: string[] })[] } {
  const validate = getAjvValidator(schema, schemaLoc, resolve, disallowAdditionalProperties);
  if (!validate) return { valid: true, errors: [] }; // unresolved refs are reported

  const valid = validate(data, dataPath);
  return {
    valid: !!valid,
    errors: (validate.errors || []).map(beatifyErrorMessage),
  };

  function beatifyErrorMessage(error: Ajv.ErrorObject) {
    let message = error.message;
    let suggest =
      error.keyword === 'enum' ? (error.params as Ajv.EnumParams).allowedValues : undefined;
    if (suggest) {
      message += ` ${suggest.map((e) => `"${e}"`).join(', ')}`;
    }

    if (error.keyword === 'type') {
      message = `type ${message}`;
    }

    const relativePath = error.dataPath.substring(dataPath.length + 1);
    const propName = relativePath.substring(relativePath.lastIndexOf('/') + 1);
    if (propName) {
      message = `\`${propName}\` property ${message}`;
    }
    if (error.keyword === 'additionalProperties') {
      const property = (error.params as Ajv.AdditionalPropertiesParams).additionalProperty;
      message = `${message} \`${property}\``;
      error.dataPath += '/' + escapePointer(property);
    }

    return {
      ...error,
      message,
      suggest,
    };
  }
}
