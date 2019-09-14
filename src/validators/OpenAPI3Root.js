import createError from './../error';

import { OpenAPIInfo } from './OpenAPIInfo';
import { OpenAPIPaths } from './OpenAPIPaths';
import { OpenAPIComponents } from './OpenAPIComponents';

export const OpenAPIRoot = {
    validators: {
    },
    properties: {
        info() {
            return OpenAPIInfo;
        },
        paths() {
            return OpenAPIPaths;
        },
        servers() {},
        components() {
            return OpenAPIComponents;
        },
        security() {},
        tags() {},
        externalDocs() {},
    },
};