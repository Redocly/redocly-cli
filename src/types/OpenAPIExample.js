export const OpenAPIExample = {
  name: 'OpenAPIExample',
  isIdempotent: true,
  properties: {
    value: null,
    externalValue: null,
    description: null,
    summary: null,
  },
};

export const OpenAPIExampleMap = {
  isIdempotent: true,
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OpenAPIExample;
    });
    return props;
  },
};
