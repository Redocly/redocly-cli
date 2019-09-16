import createError from './../error';

import OpenAPISchema, { OpenAPISchemaObject } from './OpenAPISchema';
import { OpenAPIMediaTypeObject } from './OpenAPIMediaObject';
import { OpenAPIExampleMap } from './OpenAPIExample';

export const OpenAPIParameter = {
    validators: {
        name() {
            return (node, ctx) => {
                if (!node) return;
                if (!node.name || typeof node.name !== 'string') return createError('name is required and must be a string', node, ctx);
            }
        },
        in() {
            return (node, ctx) => {
                if (!node) return;
                if (!node.in) return createError('in field is required for Parameter object', node, ctx);
                if (typeof node.in !== 'string') return createError('in field must be a string', node, ctx);
                if (!['query', 'header', 'path', 'cookie'].includes(node.in)) return createError("in value can be only one of: 'query', 'header', 'path', 'cookie'", node, ctx);
            }
        },
        description() {
            return (node, ctx) => {
                if (node && node.description && typeof node.description !== 'string') return createError('description field must be a string', node, ctx);
            }
        },
        required() {
            return (node, ctx) => {
                if (node && node.required && typeof node.required !== 'boolean') return createError('required field must be a boolean', node, ctx);
                if (node && node.in && node.in === 'path' && !(node.required || node.required !== true)) {
                    return createError('If the parameter location is "path", this property is REQUIRED and its value MUST be true.', node, ctx);
                }
            }
        },
        deprecated() {
            return (node, ctx) => {
                if (node && node.deprecated && typeof node.deprecated !== 'boolean') return createError('deprecated field must be a boolean', node, ctx);
            }
        },
        allowEmptyValue() {
            return (node, ctx) => {
                if (node && node.allowEmptyValue && typeof node.allowEmptyValue !== 'boolean') return createError('allowEmptyValue field must be a boolean', node, ctx);
            }
        },
        explode() {
            return (node, ctx) => {
                if (node && node.explode && typeof node.explode !== 'boolean') return createError('explode field must be a boolean', node, ctx);
            }
        },
        allowReserved() {
            return (node, ctx) => {
                if (node && node.allowReserved && typeof node.allowReserved !== 'boolean') return createError('allowReserved field must be a boolean', node, ctx);
            }
        },
        example() {
            return (node, ctx) => {
                if (node.example && node.examples) return createError('The example field is mutually exclusive of the examples field.', node, ctx);
            };
        },
        examples() {
            return (node, ctx) => {
                if (node.example && node.examples) return createError('The examples field is mutually exclusive of the example field.', node, ctx);
            };
        }
    },
    properties: {
        schema() {
            return OpenAPISchemaObject;
        },
        content() {
            return OpenAPIMediaTypeObject;
        },
        examples() {
            return OpenAPIExampleMap;
        }
    }
};

export const OpenAPIParameterMap = {
    properties(node) {
        const props = {};
        Object.keys(node).forEach(k => props[k] = OpenAPIParameter);
        return props;
    }
}