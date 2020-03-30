export const OAS2SecurityRequirement = {
  name: 'OAS2SecurityRequirement',
  isIdempotent: true,
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = null;
    });
    return props;
  },
};

export default OAS2SecurityRequirement;
