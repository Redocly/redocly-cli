import createError from './../error';

import OpenAPIExternalDocumentation from './OpenAPIExternalDocumentation';
import OpenAPISchemaMap from './OpenAPISchemaMap';
import { OpenAPIDiscriminator } from './OpenAPIDiscriminator';
import { OpenAPIXML } from './OpenAPIXML';

export const OpenAPISchemaObject = {
    validators: {
        title() {
            return (node, ctx) => {
                if (node && node.title) {
                    if (!(typeof node.title === 'string')) return createError('Title of the schema must be a string', node, ctx);
                }
            }
        },
        multipleOf() {
            return (node, ctx) => {
                if (node && node.multipleOf) {
                    if (typeof node.multipleOf !== 'number') return createError('Value of multipleOf must be a number', node, ctx);
                    if (node.multipleOf < 0) return createError('Value of multipleOf must be greater or equal to zero', node, ctx);
                }
            };
        },
        maximum() {
            return (node, ctx) => {
                if (node && node.maximum) {
                    if (typeof node.maximum !== 'number') return createError('Value of maximum must be a number', node, ctx);
                }
            };
        },
        exclusiveMaximum() {
            return (node, ctx) => {
                if (node && node.exclusiveMaximum) {
                    if (typeof node.exclusiveMaximum !== 'boolean') return createError('Value of exclusiveMaximum must be a boolean', node, ctx);
                }
            };
        },
        minimum() {
            return (node, ctx) => {
                if (node && node.minimum) {
                    if (typeof node.minimum !== 'number') return createError('Value of minimum must be a number', node, ctx);
                }
            };
        },
        exclusiveMinimum() {
            return (node, ctx) => {
                if (node && node.exclusiveMinimum) {
                    if (typeof node.exclusiveMinimum !== 'boolean') return createError('Value of exclusiveMinimum must be a boolean', node, ctx);
                }
            };
        },
        maxLength() {
            return (node, ctx) => {
                if (node && node.maxLength) {
                    if (typeof node.maxLength !== 'number') return createError('Value of maxLength must be a number', node, ctx);
                    if (node.maxLength < 0) return createError('Value of maxLength must be greater or equal to zero', node, ctx);
                }
            };
        },
        minLength() {
            return (node, ctx) => {
                if (node && node.minLength) {
                    if (typeof node.minLength !== 'number') return createError('Value of minLength must be a number', node, ctx);
                    if (node.minLength < 0) return createError('Value of minLength must be greater or equal to zero', node, ctx);
                }
            };
        },
        pattern() {
            return (node, ctx) => {
                if (node && node.pattern) {
                    //TODO: add regexp validation.
                    if (typeof node.pattern !== 'string') return createError('Value of pattern must be a string', node, ctx);
                }
            };
        },
        maxItems() {
            return (node, ctx) => {
                if (node && node.maxItems) {
                    if (typeof node.maxItems !== 'number') return createError('Value of maxItems must be a number', node, ctx);
                    if (node.maxItems < 0) return createError('Value of maxItems must be greater or equal to zero. You can`t have negative amount of something.', node, ctx);
                }
            };
        },
        minItems() {
            return (node, ctx) => {
                if (node && node.minItems) {
                    if (typeof node.minItems !== 'number') return createError('Value of minItems must be a number', node, ctx);
                    if (node.minItems < 0) return createError('Value of minItems must be greater or equal to zero. You can`t have negative amount of something.', node, ctx);
                }
            };
        },
        uniqueItems() {
            return (node, ctx) => {
                if (node && node.uniqueItems) {
                    if (typeof node.uniqueItems !== 'boolean') return createError('Value of uniqueItems must be a boolean', node, ctx);
                }
            };
        },
        maxProperties() {
            return (node, ctx) => {
                if (node && node.maxProperties) {
                    if (typeof node.maxProperties !== 'number') return createError('Value of maxProperties must be a number', node, ctx);
                    if (node.maxProperties < 0) return createError('Value of maxProperties must be greater or equal to zero. You can`t have negative amount of something.', node, ctx);
                }
            };
        },
        minProperties() {
            return (node, ctx) => {
                if (node && node.minProperties) {
                    if (typeof node.minProperties !== 'number') return createError('Value of minProperties must be a number', node, ctx);
                    if (node.minProperties < 0) return createError('Value of minProperties must be greater or equal to zero. You can`t have negative amount of something.', node, ctx);
                }
            };
        },
        required() {
            return (node, ctx) => {
                if (node && node.required) {
                    if (!Array.isArray(node.required)) return createError('Value of required must be an array', node, ctx);
                    if (node.required.filter(item => typeof item !== 'string').length !== 0) return createError('All values of "required" field must be strings', node, ctx);
                }
            };
        },
        enum() {
            return (node, ctx) => {
                if (node && node.enum) {
                    if (!Array.isArray(node.enum)) return createError('Value of enum must be an array', node, ctx);
                    if (node.type && node.enum.filter(item => typeof item !== node.type).length !== 0) {
                        console.log(node.enum);
                        return createError('All values of "enum" field must be of the same type as the "type" field', node, ctx);

                    }
                }
            };
        },
        type() {
            return (node, ctx) => {
                // if (!node || !node.type) return createError('Schema Object must include type', node, ctx);
                // if (!['string', 'object', 'array', 'integer', 'number', 'boolean'].includes(node.type)) {
                //     return createError('Object type can be one of following only: "string", "object", "array", "integer", "number", "boolean"', node, ctx);
                // }
            }
        },
        items() {
            return (node, ctx) => {
                if (node && node.items) {
                    if (Array.isArray(node.items)) return createError('Value of items must not be an array. It must be a Schema object', node, ctx);
                }
            };
        },
        additionalProperties() {
            return (node, ctx) => {};
        },
        description() {
            return (node, ctx) => {
                if (node && node.description) {
                    if (typeof node.description !== 'string') return createError('Value of description must be a string', node, ctx);
                }
            };
        },
        format() {
            return (node, ctx) => {
                if (node && node.format) {
                    if (typeof node.format !== 'string') return createError('Value of format must be a string', node, ctx);
                }
            };
        },
        nullable() {
            return (node, ctx) => {
                if (node && node.nullable) {
                    if (typeof node.nullable !== 'boolean') return createError('Value of nullable must be a boolean', node, ctx);
                }
            };
        },
        readOnly() {
            return (node, ctx) => {
                if (node && node.readOnly) {
                    if (typeof node.readOnly !== 'boolean') return createError('Value of readOnly must be a boolean', node, ctx);
                }
            };
        },
        writeOnly() {
            return (node, ctx) => {
                if (node && node.writeOnly) {
                    if (typeof node.writeOnly !== 'boolean') return createError('Value of writeOnly must be a boolean', node, ctx);
                }
            };
        },
        deprecated() {
            return (node, ctx) => {
                if (node && node.deprecated) {
                    if (typeof node.deprecated !== 'boolean') return createError('Value of deprecated must be a boolean', node, ctx);
                }
            };
        }
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
        xml: OpenAPIXML
    }
};

export default OpenAPISchemaObject;