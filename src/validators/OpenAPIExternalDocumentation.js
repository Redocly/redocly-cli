import { isUrl } from './../utils';

const OpenAPIExternalDocumentation = {
    validators: {
        description() {
            return (node, ctx) => node && node.description && typeof node.description !== 'string' ? createError('description of the ExternalDocumentation object must be a string', node, ctx) : null;
        },
        url() {
            return (node, ctx) => {
                if (node && !node.url) return createError('url is a required field for an ExternalDocumentation object', node, ctx);
                if (!isUrl(node.url)) return createError('url must be a valid URL', node, ctx);
            }
        },
    }
};

export default OpenAPIExternalDocumentation;