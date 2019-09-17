import createError from './../error';

export const OpenAPIDiscriminator = {
    validators: {
        propertyName() {
            return (node, ctx) => {
                if (!(node && node.propertyName)) return createError('propertyName field is required for Discriminator object', node, ctx);
                if (typeof node.propertyName !== 'string') return createError('propertyName of the Discriminator must be a string', node, ctx);
            }
        },
        mapping() {
            return (node, ctx) => {
                if (node && node.mapping) {
                    if (typeof node.mapping !== 'object') return createError('mapping must be a [string, string] object', node, ctx);
                    if (Object.keys(node.mapping).filter(key => typeof node.mapping[key] !== 'string').length !== 0) return createError('mapping must be a [string, string] object', node, ctx);
                }
            }
        }
    },

};