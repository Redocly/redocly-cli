import { OAS2ExternalDocumentation } from './OAS2ExternalDocumentation';
import { OAS2Parameter } from './OAS2Parameter';
import { OAS2SecurityRequirement } from './OAS2SecurityRequirement';
import { OAS2Responses } from './OAS2Responses';

export const OAS2Operation = {
  name: 'OAS2Operation',
  isIdempotent: false,
  properties: {
    externalDocs: OAS2ExternalDocumentation,
    parameters: OAS2Parameter,
    security: OAS2SecurityRequirement,
    responses: OAS2Responses,

    tags: null,
    summary: null,
    description: null,
    operationId: null,
    consumes: null,
    produces: null,
    schemes: null,
    deprecated: null,
  },
};

export default OAS2Operation;
