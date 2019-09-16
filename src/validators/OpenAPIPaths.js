import createError from './../error';

import OpenAPIServer from './OpenAPIServer';
import { OpenAPIOperation } from './OpenAPIOperation';
import { OpenAPIParameter } from "./OpenAPIParameter";

export const OpenAPIPaths = {
    properties (node) {
        const props = {};
        Object.keys(node).forEach(k => props[k] = OpenAPIPathItem);
        return props;
    }
}

export const OpenAPIPathItem = {
    validators: {
        summary() {
            return (node, ctx) => node && node.summary && typeof node.summary !== 'string' ?
                createError('summary of the Path Item must be a string', node, ctx) : null;
        },
        description() {
            return (node, ctx) => node && node.description && typeof node.description !== 'string' ?
                createError('description of the Path Item must be a string', node, ctx) : null;
        },
        servers() {
            return (node, ctx) => node && node.servers && !Array.isArray(node.servers) ?
                createError('servers of the Path Item must be an array', node, ctx) : null;
        },
        parameters() {
            return (node, ctx) => {
                if (!node || !node.parameters) return;
                if (!Array.isArray(node.parameters)) { 
                    return createError('parameters of the Path Item must be an array', node, ctx);
                }
                if ((new Set(node.parameters)).size !== node.parameters.length) {
                    return createError('parameters must be unique in the Path Item object', node, ctx);
                }
            };
        }
    },

    properties: {
        get() {
            return OpenAPIOperation;
        },
        put() {
            return OpenAPIOperation;
        },
        post() {
            return OpenAPIOperation;
        },
        delete() {
            return OpenAPIOperation;
        },
        options() {
            return OpenAPIOperation;
        },
        head() {
            return OpenAPIOperation;
        },
        patch() {
            return OpenAPIOperation;
        },
        trace() {
            return OpenAPIOperation;
        },
        servers() {
            return OpenAPIServer;
        },
        parameters() {
            return OpenAPIParameter;
        }
    }
}

