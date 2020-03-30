export const OAS2Example = {
  name: 'OAS2Example',
  isIdempotent: true,
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = null;
    });
    return props;
  },
};

export default OAS2Example;
