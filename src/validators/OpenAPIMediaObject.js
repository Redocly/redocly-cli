/* eslint-disable import/no-cycle */
import OpenAPISchema from './OpenAPISchema';
import createError from '../error';
import { OpenAPIExampleMap } from './OpenAPIExample';
import OpenAPIEncoding from './OpenAPIEncoding';


export const OpenAPIMediaObject = {
  validators: {
    example() {
      return (node, ctx) => (node.example && node.examples ? createError('The example and examples fields are mutually exclusive', node, ctx) : null);
    },
    examples() {
      return (node, ctx) => (node.example && node.examples ? createError('The examples and example fields are mutually exclusive', node, ctx) : null);
    },
  },
  properties: {
    schema: OpenAPISchema,
    examples: OpenAPIExampleMap,
    encoding: OpenAPIEncoding,
  },
};

export const OpenAPIMediaTypeObject = {
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OpenAPIMediaObject;
    });
    return props;
  },
};
