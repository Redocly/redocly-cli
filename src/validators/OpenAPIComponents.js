import OpenAPISchemaMap from './OpenAPISchemaMap';

export const OpenAPIComponents = {
    properties: {
        schemas() {
            return OpenAPISchemaMap;
        },
        responses() {},
        parameters() {},
        examples() {},
        requestBodies() {},
        headers() {},
        securitySchemes() {},
        links() {},
        callbacks() {},
    }
};