import createError from '../error';

export const OpenAPILicense = {
  validators: {
    name() {
      return (node, ctx) => (!node || !node.name ? createError('Name is required for the license object', node, ctx, 'key') : null);
    },
    url() {
      return () => null;
    },
  },
};

export const OpenAPIContact = {
  validators: {
    name() {
      return (node, ctx) => ((node && node.name) && typeof node.name !== 'string' ? createError('Name must be a string', node, ctx) : null);
    },
    url() {
      return (node, ctx) => ((node && node.url) && typeof node.url !== 'string' ? createError('Url must be a string', node, ctx) : null);
    },
    email() {
      return (node, ctx) => ((node && node.url) && typeof node.url !== 'string' ? createError('Email must be a string', node, ctx) : null);
    },
  },
};

export const OpenAPIInfo = {
  validators: {
    title() {
      return (node, ctx) => (!node || !node.title ? createError('Info section must include title', node, ctx, 'key') : null);
    },
    version() {
      return (node, ctx) => (!node || !node.version ? createError('Version is required for the info section', node, ctx, 'key') : null);
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
