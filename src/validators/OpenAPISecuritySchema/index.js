import { OpenAPISecuritySchema } from './OpenAPISecuritySchema';

export const OpenAPISecuritySchemaMap = {
    properties(node) {
        const props = {};
        Object.keys(node).forEach(k => props[k] = OpenAPISecuritySchema);
        return props;
    }
};