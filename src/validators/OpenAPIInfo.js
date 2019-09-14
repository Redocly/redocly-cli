import createError from './../error';

export const OpenAPIInfo = {
    validators: {
        title() {
            return (title, ctx) => !title ? createError('Info section must include title', title, ctx) : null;
        },
    },
    properties: {
        license () {
            return OpenAPILicense;
        }
    }
};

export const OpenAPILicense = {
    validators: {
        name() {
            return (name, ctx) => !name ? createError('Name is required for the license object', name, ctx) : null;
        }
    },
};