import createError from './../error';
import { OpenAPIExampleMap } from './OpenAPIExample';
import { OpenAPIMediaTypeObject } from './OpenAPIMediaObject';
import OpenAPISchemaObject from './OpenAPISchema';

export const OpenAPIHeaderMap = {
    properties(node) {
        const props = {};
        Object.keys(node).forEach(k => props[k] = OpenAPIHeader);
        return props;
    }
};

export const OpenAPIHeader = {
    validators: {
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