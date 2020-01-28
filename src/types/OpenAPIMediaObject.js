/* eslint-disable import/no-cycle */
import OpenAPISchema from './OpenAPISchema';
import { OpenAPIExampleMap } from './OpenAPIExampleMap';
import OpenAPIEncodingsMap from './OpenAPIEncodingsMap';


export const OpenAPIMediaObject = {
  name: 'OpenAPIMediaObject',
  isIdempotent: true,
  properties: {
    example: null,
    schema: OpenAPISchema,
    examples: OpenAPIExampleMap,
    encoding: OpenAPIEncodingsMap,
  },
};

export default OpenAPIMediaObject;
