import { OAS2SchemaMap } from './OAS2SchemaMap';
import { OAS2ExternalDocumentation } from './OAS2ExternalDocumentation';
import { OAS2XML } from './OAS2XML';

const OAS2Schema = {
  name: 'OAS2Schema',
  isIdempotent: false,
  properties: {
    allOf() {
      return OAS2Schema;
    },
    items() {
      return OAS2Schema;
    },

    // additional oas2 fields
    xml: OAS2XML,
    externalDocs: OAS2ExternalDocumentation,
    properties: OAS2SchemaMap,
    discriminator: null,
    readOnly: null,
    example: null,
    additionalProperties: null,

    // default JSON schema fields
    title: null,
    description: null,
    default: null,
    maximum: null,
    exclusiveMaximum: null,
    minimum: null,
    exclusiveMinimum: null,
    maxLength: null,
    minLength: null,
    pattern: null,
    multipleOf: null,
    minItems: null,
    maxItems: null,
    uniqueItems: null,
    maxProperties: null,
    minProperties: null,
    required: null,
    enum: null,
    type: null,
  },
  resolvableScalars: [
    'description',
  ],
};

export { OAS2Schema };

export default OAS2Schema;
