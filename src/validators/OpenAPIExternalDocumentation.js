import createError, { createErrrorFieldTypeMismatch, createErrorMissingRequiredField } from '../error';

import { isUrl } from '../utils';

const OpenAPIExternalDocumentation = {
  validators: {
    description() {
      return (node, ctx) => (node && node.description && typeof node.description !== 'string' ? createErrrorFieldTypeMismatch('string', node, ctx) : null);
    },
    url() {
      return (node, ctx) => {
        if (node && !node.url) return createErrorMissingRequiredField('url', node, ctx, 'key');
        if (!isUrl(node.url)) return createError('url must be a valid URL', node, ctx);
        return null;
      };
    },
  },
};

export default OpenAPIExternalDocumentation;
