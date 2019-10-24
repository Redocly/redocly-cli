import OpenAPISchemaObject from './OpenAPISchema';
import { OpenAPIMediaTypeObject } from './OpenAPIMediaTypeObject';
import { OpenAPIExampleMap } from './OpenAPIExampleMap';

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

export default OpenAPIParameter;
