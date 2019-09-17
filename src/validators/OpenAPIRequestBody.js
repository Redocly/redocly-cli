import createError from "../error";
import { OpenAPIMediaTypeObject } from "./OpenAPIMediaObject";

export const OpenAPIRequestBody = {
    validators: {
        description () {
            return (node, ctx) => {
                if (node && node.description && typeof node.description !== 'string') {
                    return createError('The required field must be a string.', node, ctx);
                }
            }
        },
        content() {
            return (node, ctx) => {
                if (node && !node.content) {
                    return createError('The content field is required for the Open API RequestBody object.', node, ctx);
                }
            }
        },
        required() {
            return (node, ctx) => {
                if (node && node.required && typeof node.required !== 'boolean') {
                    return createError('The required field must be a boolean.', node, ctx);
                }
            }
        }
    },
    properties: {
        content() {
            return OpenAPIMediaTypeObject;
        }
    }
};

export const OpenAPIRequestBodyMap = {
    properties (node) {
        const props = {};
        Object.keys(node).forEach(k => props[k] = OpenAPIRequestBody);
        return props;
    }
};