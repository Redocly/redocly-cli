export const OpenAPIExample = {
  name: 'OpenAPIExample',
  allowedFields: [
    'value',
    'externalValue',
    'description',
    'summary',
  ],
};

export const OpenAPIExampleMap = {
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OpenAPIExample;
    });
    return props;
  },
};
