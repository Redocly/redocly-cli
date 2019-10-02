export const OpenAPIExample = {
  name: 'OpenAPIExample',
  isIdempotent: true,
  allowedFields: [
    'value',
    'externalValue',
    'description',
    'summary',
  ],
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
