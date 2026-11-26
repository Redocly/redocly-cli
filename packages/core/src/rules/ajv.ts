import Ajv2020, {
  type ErrorObject,
  type ValidateFunction,
  type Context as AjvContext,
  type Options,
} from '@redocly/ajv/dist/2020.js';
import AjvDraft4 from '@redocly/ajv/dist/draft4.js';
import addFormats from 'ajv-formats';

import {
  escapePointerFragment,
  getSchemaId,
  isAbsoluteUrl,
  isRef,
  isRefWithSiblings,
  isSchemeUri,
  type Location,
} from '../ref-utils.js';
import { getEnclosingSchemaScope, hasSchemaScopes } from '../resolve.js';
import type { Oas3Schema, Oas3_1Schema } from '../typings/openapi.js';
import { dequal } from '../utils/dequal.js';
import { isPlainObject } from '../utils/is-plain-object.js';
import type { ResolveFn, UserContext } from '../walk.js';

type AjvDialect = '2020' | 'draft4';

// Ajv does not validate these keywords, so schemas that differ only in them share one compiled validator.
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
  // keyed by dialect, plus the $id resource for schemas inside one (see getValidator)
  private instances = new Map<string, any>();
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

  private getAjv(resolve: ResolveFn, dialect: AjvDialect, schemaScope?: string): any {
    const instanceKey = schemaScope === undefined ? dialect : `${dialect} ${schemaScope}`;
    let instance = this.instances.get(instanceKey);
    if (!instance) {
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
        // Without it, `98.8` fails `multipleOf: 0.1` because of floating point division.
        multipleOfPrecision: 6,
        passContext: true,
        logger: false,
        loadSchemaSync(base: string, $ref: string, $id: string) {
          const decodedBase = decodeURI(base.split('#')[0]);
          let resolvedRef = resolve({ $ref }, decodedBase);
          if (!resolvedRef?.location && hasSchemaScopes(resolve)) {
            resolvedRef = resolveFromEnclosingSchema(resolve, base, $ref) ?? resolvedRef;
          }
          if (!resolvedRef || !resolvedRef.location) return false;

          return {
            [schemaIdKey]: encodeURI(resolvedRef.location.source.absoluteRef) + '#' + $id,
            ...withResourceId(resolvedRef.node, resolvedRef.location, resolve, dialect),
          };
        },
      };

      instance =
        dialect === '2020' ? new (Ajv2020 as any)(options) : new (AjvDraft4 as any)(options);

      (addFormats as any)(instance);
      this.instances.set(instanceKey, instance);
    }
    return instance;
  }

  private getValidator(
    schema: Oas3Schema | Oas3_1Schema,
    loc: Location,
    resolve: ResolveFn,
    allowAdditionalProperties: boolean,
    dialect: AjvDialect
  ): ValidateFunction | undefined {
    // Every plain `$ref` to a schema shares the validator of its target.
    if (isRef(schema) && !isRefWithSiblings(schema)) {
      const resolved = resolve<Oas3Schema | Oas3_1Schema>(schema, loc.source.absoluteRef);
      if (resolved.location && isPlainObject(resolved.node)) {
        schema = resolved.node;
        loc = resolved.location;
      }
    }

    // Ajv caches the schemas it loads by URI. Two $id resources can both contain `#/$defs/Item`, so
    // schemas inside an $id resource get an Ajv instance of their own resource.
    const schemaScope = dialect === '2020' ? getEnclosingSchemaScope(resolve, loc) : undefined;
    const ajv = this.getAjv(resolve, dialect, schemaScope?.refBase);
    schema = withResourceId(schema, loc, resolve, dialect);

    const registered = getRegisteredById(ajv, schema, dialect);
    if (registered) {
      return registered;
    }

    // A missing schema goes to the location path below, which accepts any value.
    const shape = isPlainObject(schema) ? getSchemaShape(schema, dialect) : undefined;
    if (shape) {
      const sharedValidator = this.sharedValidators.get(shape);
      if (sharedValidator) {
        return sharedValidator;
      }
      ajv.setDefaultUnevaluatedProperties(allowAdditionalProperties);
      const validate: ValidateFunction = ajv.compile(schema);
      this.sharedValidators.set(shape, validate);
      return validate;
    }

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

    return ajv.getSchema($id);
  }
}

// A schema's $id may be relative to its parent resources, which Ajv does not see when the schema is
// compiled on its own. The schema gets the resolved URI of the resource its $id declares instead.
function withResourceId<T>(schema: T, loc: Location, resolve: ResolveFn, dialect: AjvDialect): T {
  if (dialect !== '2020' || getSchemaId(schema) === undefined) return schema;
  const scope = getEnclosingSchemaScope(resolve, loc);
  // example rules pass `<schema location>/schema` for a schema's own examples
  if (
    !scope ||
    (loc.pointer !== scope.nodePointer && loc.pointer !== `${scope.nodePointer}/schema`)
  ) {
    return schema;
  }
  const { baseUri } = scope;
  return {
    ...schema,
    $id: isAbsoluteUrl(baseUri) || isSchemeUri(baseUri) ? baseUri : encodeURI(baseUri),
  };
}

// A schema compiled from a location inside an $id resource has that location as its Ajv id
// (`<file>#<pointer>`, or `<file>#<file>#<pointer>` once loaded through a ref), so a ref written in
// it that the file does not resolve is looked up against the enclosing resource.
function resolveFromEnclosingSchema(resolve: ResolveFn, base: string, $ref: string) {
  const parts = base.split('#');
  if (parts.length !== 2 && !(parts.length === 3 && parts[0] === parts[1])) return undefined;
  let location: Location;
  try {
    location = {
      source: { absoluteRef: decodeURI(parts[0]) },
      pointer: decodeURI('#' + parts[parts.length - 1]),
    } as Location;
  } catch {
    return undefined;
  }
  const scope = getEnclosingSchemaScope(resolve, location);
  return scope ? resolve({ $ref }, scope.refBase) : undefined;
}

// A schema with an $id may already be in Ajv, e.g. loaded through a `$ref` from another schema.
// Ajv refuses to add the same $id twice, so the registered schema is reused when it is the same one.
function getRegisteredById(
  ajv: { getSchema(id: string): ValidateFunction | undefined },
  schema: Oas3Schema | Oas3_1Schema,
  dialect: AjvDialect
): ValidateFunction | undefined {
  if (dialect !== '2020' || !isPlainObject(schema)) return undefined;
  const schemaId = (schema as Record<string, unknown>).$id;
  if (typeof schemaId !== 'string') return undefined;
  const registered = ajv.getSchema(schemaId);
  return registered && dequal(registered.schema, schema) ? registered : undefined;
}

function getSchemaShape(schema: Oas3Schema | Oas3_1Schema, dialect: AjvDialect) {
  const keywords: Record<string, unknown> = { ...schema };
  for (const keyword of ANNOTATION_KEYWORDS) {
    delete keywords[keyword];
  }
  const shape = JSON.stringify(keywords);
  if (shape.includes('"$ref"')) {
    return undefined;
  }
  return `${dialect}:${shape}`;
}
