// @ts-check
/* eslint-disable import/no-cycle */

import OpenAPIExternalDocumentation from './OpenAPIExternalDocumentation';
import OpenAPISchemaMap from './OpenAPISchemaMap';
import OpenAPIDiscriminator from './OpenAPIDiscriminator';
import OpenAPIXML from './OpenAPIXML';

const OpenAPISchemaObject = {
  name: 'OpenAPISchema',
  isIdempotent: true,
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
    additionalProperties(value) {
      switch (typeof value) {
        case 'boolean':
          return null;
        default:
          return OpenAPISchemaObject;
      }
    },
    properties: OpenAPISchemaMap,
    discriminator: OpenAPIDiscriminator,
    externalDocs: OpenAPIExternalDocumentation,
    xml: OpenAPIXML,

    title: null,
    description: null,
    multipleOf: null,
    maximum: null,
    exclusiveMaximum: null,
    minimum: null,
    exclusiveMinimum: null,
    maxLength: null,
    minLength: null,
    pattern: null,
    maxItems: null,
    minItems: null,
    uniqueItems: null,
    maxProperties: null,
    minProperties: null,
    required: null,
    enum: null,
    type: null,
    format: null,
    nullable: null,
    readOnly: null,
    writeOnly: null,
    deprecated: null,
    example: null,
    default: null,
  },
  resolvableScalars: [
    'description',
  ],
};

export default OpenAPISchemaObject;
