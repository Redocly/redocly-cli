import OpenAPISchemaObject from './OpenAPISchema';
import { OpenAPIMediaTypeObject } from './OpenAPIMediaObject';
import { OpenAPIExampleMap } from './OpenAPIExample';

export const OpenAPIParameter = {
  name: 'OpenAPIParameter',
  isIdempotent: false,
  allowedFields: [
    'name',
    'in',
    'description',
    'required',
    'deprecated',
    'allowEmptyValue',
    'style',
    'explode',
    'allowReserved',
    'example',
    'examples',
    'schema',
    'content',
  ],
  properties: {
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
