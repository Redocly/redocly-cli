import { createErrorMissingRequiredField, createErrrorFieldTypeMismatch } from '../error';

export const OpenAPILicense = {
  validators: {
    name() {
      return (node, ctx) => (!node || !node.name ? createErrorMissingRequiredField('name', node, ctx) : null);
    },
    url() {
      return () => null;
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
