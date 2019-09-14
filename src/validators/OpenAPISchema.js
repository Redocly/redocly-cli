import createError from './../error';

export const OpenAPISchemaObject = {
    validators: {
        type() {
            return (type, ctx) => !type ? createError('Schema Object must include type', type, ctx) : null;
        }
    },
    properties: {
        allOf() {
            return OpenAPISchemaObject;
        }
    }
};