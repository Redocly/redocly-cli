import createError from './../error';

export const OpenAPILicense = {
    validators: {
        name() {
            return (node, ctx) => !node || !node.name ? createError('Name is required for the license object', node, ctx) : null;
        }
    },
};

export const OpenAPIInfo = {
    validators: {
        title() {
            return (node, ctx) => !node || !node.title ? createError('Info section must include title', node, ctx) : null;
        },
    },
    properties: {
        license: OpenAPILicense,
    }
};