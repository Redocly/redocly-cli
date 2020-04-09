import { OAS2Operation } from './OAS2Operation';
import { OAS2Parameter } from './OAS2Parameter';

export const OAS2PathItem = {
  name: 'OAS2PathItem',
  isIdempotent: true,
  properties: {
    get: OAS2Operation,
    put: OAS2Operation,
    post: OAS2Operation,
    delete: OAS2Operation,
    options: OAS2Operation,
    head: OAS2Operation,
    patch: OAS2Operation,
    parameters: OAS2Parameter,
  },
};

export default OAS2PathItem;
