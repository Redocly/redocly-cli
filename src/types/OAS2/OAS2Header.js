import { OAS2Items } from './OAS2Items';

export const OAS2Header = {
  name: 'OAS2Header',
  isIdempotent: true,
  properties: {
    items: OAS2Items,

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

export default OAS2Header;
