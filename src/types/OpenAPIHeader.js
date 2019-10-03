import { OpenAPIExampleMap } from './OpenAPIExample';
// eslint-disable-next-line import/no-cycle
import { OpenAPIMediaTypeObject } from './OpenAPIMediaObject';
import OpenAPISchemaObject from './OpenAPISchema';

export const OpenAPIHeader = {
  name: 'OpenAPIHeader',
  isIdempotent: true,
  properties: {
    description: null,
    required: null,
    deprecated: null,
    allowEmptyValue: null,
    explode: null,
    allowReserved: null,
    example: null,
    schema: OpenAPISchemaObject,
    content: OpenAPIMediaTypeObject,
    examples: OpenAPIExampleMap,
  },
};

export const OpenAPIHeaderMap = {
  isIdempotent: true,
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OpenAPIHeader;
    });
    return props;
  },
};
