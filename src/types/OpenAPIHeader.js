import { OpenAPIExampleMap } from './OpenAPIExampleMap';
// eslint-disable-next-line import/no-cycle
import { OpenAPIMediaTypeObject } from './OpenAPIMediaTypeObject';
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

export default OpenAPIHeader;
