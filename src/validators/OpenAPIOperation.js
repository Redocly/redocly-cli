import createError from './../error';

import { OpenAPIResponseMap } from './OpenAPIResponse';
import { OpenAPIParameter } from './OpenAPIParameter';
import OpenAPIServer from './OpenAPIServer';
import OpenAPIExternalDocumentation from './OpenAPIExternalDocumentation';
import { OpenAPICallbackMap } from './OpenAPICallback';
import { OpenAPIRequestBody } from './OpenAPIRequestBody';

export const OpenAPIOperation = {
    validators: {
        tags() {
            return (node, ctx) => {
                if (node && node.tags && !Array.isArray(node.tags)) {
                    return createError('The tags field must be an array in the Open API Operation object.', node, ctx);
                }
                if (node && node.tags && node.tags.filter(item => typeof item !== 'string').length > 0) {
                    return createError('Items of the tags array must be strings in the Open API Operation object.', node, ctx);
                }
            }
        },
        summary() {
            return (node, ctx) => {
                if (node && node.summary && typeof node.summary !== 'string') return createError('The summary field must be a string', node, ctx);
            };
        },
        description() {
            return (node, ctx) => {
                if (node && node.description && typeof node.description !== 'string') return createError('The description field must be a string', node, ctx);
            };
        },
        operationId() {
            return (node, ctx) => {
                if (node && node.operationId && typeof node.operationId !== 'string') return createError('The operationId field must be a string', node, ctx);
            };
        },
        responses() {
            return (node, ctx) => !node.responses ? createError('Operation must include responses section', node, ctx) : null;
        },
        deprecated() {
            return (node, ctx) => {
                if (node && node.deprecated && typeof node.deprecated !== 'boolean') return createError('The deprecated field must be a string', node, ctx);
            };
        },
    },
    properties: {
        externalDocs() {
            return OpenAPIExternalDocumentation;
        },
        parameters() {
            return OpenAPIParameter;
        },
        requestBody() {
            return OpenAPIRequestBody;
        },
        responses() {
            return OpenAPIResponseMap;
        },
        callbacks() {
            return OpenAPICallbackMap;
        },
        security() {},
        server() {
            return OpenAPIServer;
        }
    }
};

