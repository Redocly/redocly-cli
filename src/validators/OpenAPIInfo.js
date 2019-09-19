import createError from '../error';

export const OpenAPILicense = {
  validators: {
    name() {
      return (node, ctx) => (!node || !node.name ? createError('Name is required for the license object', node, ctx, 'key') : null);
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
  },
  properties: {
    license: OpenAPILicense,
  },
};
