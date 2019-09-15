import createError from './../error';

import { OpenAPIInfo } from './OpenAPIInfo';
import { OpenAPIPaths } from './OpenAPIPaths';
import { OpenAPIComponents } from './OpenAPIComponents';
import { OpenAPIServer } from './OpenAPIServer';

export const OpenAPIRoot = {
    validators: {
        openapi() {
            return (node, ctx) => {
                //TODO
                return null;
            }
        }
    },
    properties: {
        info() {
            return OpenAPIInfo;
        },
        paths() {
            return OpenAPIPaths;
        },
        servers() {
            return OpenAPIServer;
        },
        components() {
            return OpenAPIComponents;
        },
        security() {},
        tags() {},
        externalDocs() {},
    },
};