import OpenAPISchemaMap from './OpenAPISchemaMap';
import { OpenAPISecuritySchemaMap } from './OpenAPISecuritySchema';
import { OpenAPIExampleMap } from './OpenAPIExample';
import { OpenAPIParameterMap } from './OpenAPIParameter';
import { OpenAPIResponseMap } from './OpenAPIResponse';
import { OpenAPIHeaderMap } from './OpenAPIHeader';
import { OpenAPILinkMap } from './OpenAPILink';
import { OpenAPICallbackMap } from './OpenAPICallback';
import { OpenAPIRequestBodyMap } from './OpenAPIRequestBody';

export const OpenAPIComponents = {
    properties: {
        schemas() {
            return OpenAPISchemaMap;
        },
        responses() {
            return OpenAPIResponseMap;
        },
        parameters() {
            return OpenAPIParameterMap;
        },
        examples() {
            return OpenAPIExampleMap;
        },
        requestBodies() {
            return OpenAPIRequestBodyMap;
        },
        headers() {
            return OpenAPIHeaderMap;
        },
        securitySchemes() {
            return OpenAPISecuritySchemaMap;
        },
        links() {
            return OpenAPILinkMap;
        },
        callbacks() {
            return OpenAPICallbackMap;
        },
    }
};