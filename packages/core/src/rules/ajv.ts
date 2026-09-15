import Ajv2020, {
  type ErrorObject,
  type ValidateFunction,
  type Context as AjvContext,
  type Options,
} from '@redocly/ajv/dist/2020.js';
import AjvDraft4 from '@redocly/ajv/dist/draft4.js';
import addFormats from 'ajv-formats';

import { escapePointerFragment, isRef, isRefWithSiblings, type Location } from '../ref-utils.js';
import type { Oas3Schema, Oas3_1Schema } from '../typings/openapi.js';
import type { ResolveFn, UserContext } from '../walk.js';

type AjvDialect = '2020' | 'draft4';

// Keywords that do not affect validation here, so schemas that differ only in them share one validator.
const ANNOTATION_KEYWORDS = [
  'title',
  'description',
  'example',
  'examples',
  'default',
  'deprecated',
];

function getSchemaIdKey(dialect: AjvDialect) {
  return dialect === 'draft4' ? 'id' : '$id';
}

function getDialectBySpecVersion(specVersion: UserContext['specVersion']): AjvDialect {
  if (specVersion === 'oas2' || specVersion === 'oas3_0') return 'draft4';
  return '2020';
}

export class AjvValidator {
  private instances: Partial<Record<AjvDialect, any>> = {};
  private sharedValidators = new Map<string, ValidateFunction>();

  validate(
    data: unknown,
    schema: Oas3Schema | Oas3_1Schema,
    options: {
      schemaLoc: Location;
      instancePath: string;
      resolve: ResolveFn;
      allowAdditionalProperties: boolean;
      ajvContext?: AjvContext;
      specVersion: UserContext['specVersion'];
    }
  ): { valid: boolean; errors: (ErrorObject & { suggest?: string[] })[] } {
    const { schemaLoc, instancePath, resolve, allowAdditionalProperties, ajvContext, specVersion } =
      options;

    const dialect = getDialectBySpecVersion(specVersion);
    const validate = this.getValidator(
      schema,
      schemaLoc,
      resolve,
      allowAdditionalProperties,
      dialect
    );
    if (!validate) return { valid: true, errors: [] }; // unresolved refs are reported

    const dataCxt = {
      instancePath,
      parentData: { fake: {} },
      parentDataProperty: 'fake',
      rootData: {},
      dynamicAnchors: {},
    };
    const valid = validate.call(ajvContext ?? {}, data, dataCxt);

    return {
      valid: !!valid,
      errors: (validate.errors || []).map(beatifyErrorMessage),
    };

    function beatifyErrorMessage(error: ErrorObject) {
      let message = error.message;
      const suggest: string[] | undefined =
        error.keyword === 'enum' ? error.params.allowedValues : undefined;
      if (suggest) {
        message += ` ${suggest.map((e) => `"${e}"`).join(', ')}`;
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

  private getAjv(resolve: ResolveFn, dialect: AjvDialect): any {
    if (!this.instances[dialect]) {
      const schemaIdKey = getSchemaIdKey(dialect);

      const options: Options = {
        schemaId: schemaIdKey,
        meta: true,
        allErrors: true,
        strictSchema: false,
        inlineRefs: false,
        validateSchema: false,
        discriminator: true,
        allowUnionTypes: true,
        validateFormats: true,
        passContext: true,
        logger: false,
        loadSchemaSync(base: string, $ref: string, $id: string) {
          const decodedBase = decodeURI(base.split('#')[0]);
          const resolvedRef = resolve({ $ref }, decodedBase);
          if (!resolvedRef || !resolvedRef.location) return false;

          return {
            [schemaIdKey]: encodeURI(resolvedRef.location.source.absoluteRef) + '#' + $id,
            ...resolvedRef.node,
          };
        },
      };

      this.instances[dialect] =
        dialect === '2020' ? new (Ajv2020 as any)(options) : new (AjvDraft4 as any)(options);

      (addFormats as any)(this.instances[dialect]);
    }
    return this.instances[dialect];
  }

  private getValidator(
    schema: Oas3Schema | Oas3_1Schema,
    loc: Location,
    resolve: ResolveFn,
    allowAdditionalProperties: boolean,
    dialect: AjvDialect
  ): ValidateFunction | undefined {
    const ajv = this.getAjv(resolve, dialect);
    // Every place that references the same schema shares one compiled validator.
    if (isRef(schema) && !isRefWithSiblings(schema)) {
      const resolved = resolve<Oas3Schema | Oas3_1Schema>(schema, loc.source.absoluteRef);
      if (resolved.location) {
        schema = resolved.node;
        loc = resolved.location;
      }
    }
    // A schema without `$ref` does not depend on its location, so equal schemas share one compiled validator.
    const shape = getSchemaShape(schema, dialect);
    const sharedValidator = shape && this.sharedValidators.get(shape);
    if (sharedValidator) return sharedValidator;

    const $id = encodeURI(loc.absolutePointer);
    const schemaIdKey = getSchemaIdKey(dialect);

    if (!ajv.getSchema($id)) {
      ajv.setDefaultUnevaluatedProperties(allowAdditionalProperties);
      ajv.addSchema(
        {
          [schemaIdKey]: $id,
          ...schema,
        },
        $id
      );
    }

    const validate = ajv.getSchema($id);
    if (shape && validate) {
      this.sharedValidators.set(shape, validate);
    }
    return validate;
  }
}

function getSchemaShape(schema: Oas3Schema | Oas3_1Schema, dialect: AjvDialect) {
  const keywords: Record<string, unknown> = { ...schema };
  for (const keyword of ANNOTATION_KEYWORDS) {
    delete keywords[keyword];
  }
  const shape = JSON.stringify(keywords);
  return shape.includes('"$ref"') ? undefined : `${dialect}:${shape}`;
}
