import OpenAPISchemaObject from './OpenAPISchema';
import { OpenAPIMediaTypeObject } from './OpenAPIMediaObject';
import { OpenAPIExampleMap } from './OpenAPIExample';

export const OpenAPIParameter = {
  name: 'OpenAPIParameter',
  isIdempotent: false,
  properties: {
    name: null,
    in: null,
    description: null,
    required: null,
    deprecated: null,
    allowEmptyValue: null,
    style: null,
    explode: null,
    allowReserved: null,
    example: null,
    schema: OpenAPISchemaObject,
    content: OpenAPIMediaTypeObject,
    examples: OpenAPIExampleMap,
  },
};

export const OpenAPIParameterMap = {
  name: 'OpenAPIParameterMap',
  isIdempotent: true,
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OpenAPIParameter;
    });
    return props;
  },
};
