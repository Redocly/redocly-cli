/* eslint-disable import/no-cycle */
import OpenAPISchema from './OpenAPISchema';
import { OpenAPIExampleMap, OpenAPIExample } from './OpenAPIExample';
import OpenAPIEncoding from './OpenAPIEncoding';


export const OpenAPIMediaObject = {
  name: 'OpenAPIMediaObject',
  isIdempotent: true,
  properties: {
    example: OpenAPIExample,
    schema: OpenAPISchema,
    examples: OpenAPIExampleMap,
    encoding: OpenAPIEncoding,
  },
};

export const OpenAPIMediaTypeObject = {
  isIdempotent: true,
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OpenAPIMediaObject;
    });
    return props;
  },
};
