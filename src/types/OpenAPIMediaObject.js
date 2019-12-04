/* eslint-disable import/no-cycle */
import OpenAPISchema from './OpenAPISchema';
import { OpenAPIExampleMap } from './OpenAPIExampleMap';
import OpenAPIEncoding from './OpenAPIEncoding';


export const OpenAPIMediaObject = {
  name: 'OpenAPIMediaObject',
  isIdempotent: true,
  properties: {
    example: null,
    schema: OpenAPISchema,
    examples: OpenAPIExampleMap,
    encoding: OpenAPIEncoding,
  },
};

export default OpenAPIMediaObject;
