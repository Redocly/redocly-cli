import { OAS2SchemaObject } from './OAS2Schema';
import { OAS2Items } from './OAS2Items';

export const OAS2Parameter = {
  name: 'OAS2Parameter',
  isIdempotent: false,
  properties: {
    schema: OAS2SchemaObject,
    items: OAS2Items,

    name: null,
    in: null,
    description: null,
    required: null,

    type: null,
    format: null,
    allowEmptyValue: null,
    collectionFormat: null,
    default: null,

    maximum: null,
    exclusiveMaximum: null,
    minimum: null,
    exclusiveMinimum: null,
    maxLength: null,
    minLength: null,
    pattern: null,
    minItems: null,
    maxItems: null,
    uniqueItems: null,
    enum: null,
    multipleOf: null,
  },
  resolvableScalars: [
    'description',
  ],
};

export default OAS2Parameter;
