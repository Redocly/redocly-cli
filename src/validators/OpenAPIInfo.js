import createError, { createErrorMissingRequiredField, createErrrorFieldTypeMismatch } from '../error';
import { isUrl } from '../utils';

export const OpenAPILicense = {
  validators: {
    name() {
      return (node, ctx) => (!node || !node.name ? createErrorMissingRequiredField('name', node, ctx) : null);
    },
    url() {
      return (node, ctx) => (node && node.url && !isUrl(node.url) ? createError('The url field must be a valid URL', node, ctx) : null);
    },
  },
};

export const OpenAPIContact = {
  validators: {
    name() {
      return (node, ctx) => ((node && node.name) && typeof node.name !== 'string' ? createErrrorFieldTypeMismatch('string', node, ctx) : null);
    },
    url() {
      return (node, ctx) => ((node && node.url) && typeof node.url !== 'string' ? createErrrorFieldTypeMismatch('string', node, ctx) : null);
    },
    email() {
      return (node, ctx) => ((node && node.url) && typeof node.url !== 'string' ? createErrrorFieldTypeMismatch('string', node, ctx) : null);
    },
  },
};

export const OpenAPIInfo = {
  name: 'OpenAPIInfo',
  validators: {
    title() {
      return (node, ctx) => (!node || !node.title ? createErrorMissingRequiredField('title', node, ctx) : null);
    },
    version() {
      return (node, ctx) => (!node || !node.version ? createErrorMissingRequiredField('version', node, ctx) : null);
    },
    description() {
      return () => null;
    },
    termsOfService() {
      return () => null;
    },
  },
  properties: {
    license: OpenAPILicense,
    contact: OpenAPIContact,
  },
};
