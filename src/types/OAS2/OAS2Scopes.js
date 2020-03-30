export const OAS2Scopes = {
  name: 'OAS2Scopes',
  isIdempotent: true,
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = null;
    });
    return props;
  },
};

export default OAS2Scopes;
