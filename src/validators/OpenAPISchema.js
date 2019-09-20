/* eslint-disable import/no-cycle */
import createError from '../error';

import OpenAPIExternalDocumentation from './OpenAPIExternalDocumentation';
import OpenAPISchemaMap from './OpenAPISchemaMap';
import OpenAPIDiscriminator from './OpenAPIDiscriminator';
import OpenAPIXML from './OpenAPIXML';

const OpenAPISchemaObject = {
  validators: {
    title() {
      return (node, ctx) => {
        if (node && node.title) {
          if (!(typeof node.title === 'string')) return createError('Title of the schema must be a string', node, ctx);
        }
        return null;
      };
    },
    multipleOf() {
      return (node, ctx) => {
        if (node && node.multipleOf) {
          if (typeof node.multipleOf !== 'number') return createError('Value of multipleOf must be a number', node, ctx);
          if (node.multipleOf < 0) return createError('Value of multipleOf must be greater or equal to zero', node, ctx);
        }
        return null;
      };
    },
    maximum() {
      return (node, ctx) => {
        if (node && node.maximum && typeof node.maximum !== 'number') return createError('Value of maximum must be a number', node, ctx);
        return null;
      };
    },
    exclusiveMaximum() {
      return (node, ctx) => {
        if (node && node.exclusiveMaximum && typeof node.exclusiveMaximum !== 'boolean') return createError('Value of exclusiveMaximum must be a boolean', node, ctx);
        return null;
      };
    },
    minimum() {
      return (node, ctx) => {
        if (node && node.minimum && typeof node.minimum !== 'number') return createError('Value of minimum must be a number', node, ctx);
        return null;
      };
    },
    exclusiveMinimum() {
      return (node, ctx) => {
        if (node && node.exclusiveMinimum && typeof node.exclusiveMinimum !== 'boolean') return createError('Value of exclusiveMinimum must be a boolean', node, ctx);
        return null;
      };
    },
    maxLength() {
      return (node, ctx) => {
        if (node && node.maxLength) {
          if (typeof node.maxLength !== 'number') return createError('Value of maxLength must be a number', node, ctx);
          if (node.maxLength < 0) return createError('Value of maxLength must be greater or equal to zero', node, ctx);
        }
        return null;
      };
    },
    minLength() {
      return (node, ctx) => {
        if (node && node.minLength) {
          if (typeof node.minLength !== 'number') return createError('Value of minLength must be a number', node, ctx);
          if (node.minLength < 0) return createError('Value of minLength must be greater or equal to zero', node, ctx);
        }
        return null;
      };
    },
    pattern() {
      return (node, ctx) => {
        if (node && node.pattern) {
          // TODO: add regexp validation.
          if (typeof node.pattern !== 'string') return createError('Value of pattern must be a string', node, ctx);
        }
        return null;
      };
    },
    maxItems() {
      return (node, ctx) => {
        if (node && node.maxItems) {
          if (typeof node.maxItems !== 'number') return createError('Value of maxItems must be a number', node, ctx);
          if (node.maxItems < 0) return createError('Value of maxItems must be greater or equal to zero. You can`t have negative amount of something.', node, ctx);
        }
        return null;
      };
    },
    minItems() {
      return (node, ctx) => {
        if (node && node.minItems) {
          if (typeof node.minItems !== 'number') return createError('Value of minItems must be a number', node, ctx);
          if (node.minItems < 0) return createError('Value of minItems must be greater or equal to zero. You can`t have negative amount of something.', node, ctx);
        }
        return null;
      };
    },
    uniqueItems() {
      return (node, ctx) => {
        if (node && node.uniqueItems) {
          if (typeof node.uniqueItems !== 'boolean') return createError('Value of uniqueItems must be a boolean', node, ctx);
        }
        return null;
      };
    },
    maxProperties() {
      return (node, ctx) => {
        if (node && node.maxProperties) {
          if (typeof node.maxProperties !== 'number') return createError('Value of maxProperties must be a number', node, ctx);
          if (node.maxProperties < 0) return createError('Value of maxProperties must be greater or equal to zero. You can`t have negative amount of something.', node, ctx);
        }
        return null;
      };
    },
    minProperties() {
      return (node, ctx) => {
        if (node && node.minProperties) {
          if (typeof node.minProperties !== 'number') return createError('Value of minProperties must be a number', node, ctx);
          if (node.minProperties < 0) return createError('Value of minProperties must be greater or equal to zero. You can`t have negative amount of something.', node, ctx);
        }
        return null;
      };
    },
    required() {
      return (node, ctx) => {
        if (node && node.required) {
          if (!Array.isArray(node.required)) return createError('Value of required must be an array', node, ctx);
          if (node.required.filter((item) => typeof item !== 'string').length !== 0) return createError('All values of "required" field must be strings', node, ctx);
        }
        return null;
      };
    },
    enum() {
      return (node, ctx) => {
        if (node && node.enum) {
          if (!Array.isArray(node.enum)) return createError('Value of enum must be an array', node, ctx);
          if (node.type
              && typeof node.type === 'string'
              // eslint-disable-next-line valid-typeof
              && node.enum.filter((item) => typeof item !== node.type).length !== 0) {
            return createError('All values of "enum" field must be of the same type as the "type" field', node, ctx);
          }
        }
        return null;
      };
    },
    type() {
      return (node, ctx) => {
        if (node.type && !['string', 'object', 'array', 'integer', 'number', 'boolean'].includes(node.type)) {
          return createError('Object type can be one of following only: "string", "object", "array", "integer", "number", "boolean"', node, ctx);
        }
        return null;
      };
    },
    items() {
      return (node, ctx) => {
        if (node && node.items && Array.isArray(node.items)) return createError('Value of items must not be an array. It must be a Schema object', node, ctx);
        return null;
      };
    },
    additionalProperties() {
      return () => null;
    },
    description() {
      return (node, ctx) => {
        if (node && node.description && typeof node.description !== 'string') return createError('Value of description must be a string', node, ctx);
        return null;
      };
    },
    format() {
      return (node, ctx) => {
        if (node && node.format && typeof node.format !== 'string') return createError('Value of format must be a string', node, ctx);
        return null;
      };
    },
    nullable() {
      return (node, ctx) => {
        if (node && node.nullable && typeof node.nullable !== 'boolean') return createError('Value of nullable must be a boolean', node, ctx);
        return null;
      };
    },
    readOnly() {
      return (node, ctx) => {
        if (node && node.readOnly && typeof node.readOnly !== 'boolean') return createError('Value of readOnly must be a boolean', node, ctx);
        return null;
      };
    },
    writeOnly() {
      return (node, ctx) => {
        if (node && node.writeOnly && typeof node.writeOnly !== 'boolean') return createError('Value of writeOnly must be a boolean', node, ctx);
        return null;
      };
    },
    deprecated() {
      return (node, ctx) => {
        if (node && node.deprecated && typeof node.deprecated !== 'boolean') return createError('Value of deprecated must be a boolean', node, ctx);
        return null;
      };
    },
    example() {
      return () => null;
    },
    default() {
      return () => null;
    },
    allOf() {
      return () => null;
    },
  },
  properties: {
    allOf() {
      return OpenAPISchemaObject;
    },
    anyOf() {
      return OpenAPISchemaObject;
    },
    oneOf() {
      return OpenAPISchemaObject;
    },
    not() {
      return OpenAPISchemaObject;
    },
    items() {
      return OpenAPISchemaObject;
    },
    properties: OpenAPISchemaMap,
    discriminator: OpenAPIDiscriminator,
    externalDocs: OpenAPIExternalDocumentation,
    xml: OpenAPIXML,
  },
};

export default OpenAPISchemaObject;
