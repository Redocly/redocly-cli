import createError from './../error';

import { OpenAPIInfo } from './OpenAPIInfo';
import { OpenAPIPaths } from './OpenAPIPaths';
import { OpenAPIComponents } from './OpenAPIComponents';
import { OpenAPIServer } from './OpenAPIServer';
import { OpenAPISecurityRequirement } from './OpenAPISecurityRequirement';
import { OpenAPITag } from './OpenAPITag';
import OpenAPIExternalDocumentation from './OpenAPIExternalDocumentation';

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
        security() {
            return OpenAPISecurityRequirement;
        },
        tags() {
            return OpenAPITag;
        },
        externalDocs() {
            return OpenAPIExternalDocumentation;
        },
    },
};