// @ts-check
/* eslint-disable import/no-cycle */

import OpenAPIExternalDocumentation from './OpenAPIExternalDocumentation';
import OpenAPISchemaMap from './OpenAPISchemaMap';
import OpenAPIDiscriminator from './OpenAPIDiscriminator';
import OpenAPIXML from './OpenAPIXML';

const OpenAPISchemaObject = {
  name: 'OpenAPISchema',
  allowedFields: [
    'title',
    'description',
    'multipleOf',
    'maximum',
    'exclusiveMaximum',
    'minimum',
    'exclusiveMinimum',
    'maxLength',
    'minLength',
    'pattern',
    'maxItems',
    'minItems',
    'uniqueItems',
    'maxProperties',
    'minProperties',
    'required',
    'enum',
    'type',
    'items',
    'additionalProperties',
    'format',
    'nullable',
    'readOnly',
    'writeOnly',
    'deprecated',
    'example',
    'default',
  ],
  properties: {
    allOf() {
      return OpenAPISchemaObject;
    },
    anyOf() {
      return OpenAPISchemaObject;
    },
    oneOf() {
      return OpenAPISchemaObject;
    },
    not() {
      return OpenAPISchemaObject;
    },
    items() {
      return OpenAPISchemaObject;
    },
    properties: OpenAPISchemaMap,
    discriminator: OpenAPIDiscriminator,
    externalDocs: OpenAPIExternalDocumentation,
    xml: OpenAPIXML,
  },
};

export default OpenAPISchemaObject;
