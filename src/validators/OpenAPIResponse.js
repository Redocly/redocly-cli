import createError from './../error';

import { OpenAPIMediaTypeObject } from './OpenAPIMediaObject';


export const OpenAPIResponseMap = {
    properties(node) {
        const props = {};
        Object.keys(node).forEach(k => props[k] = OpenAPIResponse);
        return props;
    }
}

export const OpenAPIResponse = {
    validators: {
        description() {
            return (node, ctx) => !node.description ? createError('Description is required part of a Response definition.', node, ctx) : null;
        }
    },
    properties: {
        content: OpenAPIMediaTypeObject
    }
};