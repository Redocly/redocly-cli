import OpenAPISchema from './OpenAPISchema';
import createError from './../error';
import { OpenAPIExampleMap } from './OpenAPIExample';
import { OpenAPIEncoding } from './OpenAPIEncoding';


export const OpenAPIMediaTypeObject = {
    properties(node) {
        const props = {};
        Object.keys(node).forEach(k => props[k] = OpenAPIMediaObject);
        return props;
    }
};

export const OpenAPIMediaObject = {
    validators: {
        schema() {
            return (node, ctx) =>  !node.schema ? createError('MediaType Object must include schema', node, ctx) : null;
        },
        example() {
            return (node, ctx) => {
                if (node.example && node.examples) {
                    return createError('The example and examples fields are mutually exclusive', node, ctx);
                }
            }
        }
    },
    properties: {
        schema() {
            return OpenAPISchema;
        },
        examples() {
            return OpenAPIExampleMap;
        },
        encoding() {
            return OpenAPIEncoding;
        }
    }
};