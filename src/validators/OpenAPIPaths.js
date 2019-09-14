import createError from './../error';

import { OpenAPISchemaObject } from './OpenAPISchema';

export const OpenAPIPaths = {
    properties (node) {
        const props = {};
        Object.keys(node).forEach(k => props[k] = OpenAPIPath);
        return props;
    }
}

export const OpenAPIPath = {
    properties: {
        summary() {},
        description() {},
        get() {
            return OpenAPIOperation;
        },
        post() {
            return OpenAPIOperation;
        },
        put() {
            return OpenAPIOperation;
        },
        delete() {
            return OpenAPIOperation;
        },
        parameters() {
            return OpenAPIOperation;
        }
    }
}

export const OpenAPIOperation = {
    validators: {
        responses() {
            return (operation, ctx) => !operation ? createError('Operation must include responses section', operation, ctx) : null;
        }
    },
    properties: {
        responses() {
            return OpenAPIResponses;
        },
        parameters() {},
        operationId() {},
        description() {},
        summary() {}
    }
};

export const OpenAPIResponses = {
    properties(node) {
        const props = {};
        Object.keys(node).forEach(k => props[k] = OpenAPIResponse);
        return props;
    }
}

export const OpenAPIResponse = {
    validators: {
        description() {
            return (desc, ctx) => !desc ? createError('Description is required part of a Response definition.', desc, ctx) : null;
        }
    },
    properties: {
        content() {
            return OpenAPIMediaTypeObject;
        }
    }
};

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
            return (oSchema) =>  !oSchema ? createError('MediaType Object must include schema', oSchema, ctx) : null;
        }
    },
    properties: {
        schema() {
            return OpenAPISchemaObject;
        }
    }
};