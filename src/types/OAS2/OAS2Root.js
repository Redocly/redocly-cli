import { OAS2Info } from './OAS2Info';
import { OAS2ExternalDocumentation } from './OAS2ExternalDocumentation';
import { OAS2Tag } from './OAS2Tag';
import { OAS2SecurityDefinitions } from './OAS2SecurityDefinitions';
import { OAS2Definitions } from './OAS2Definitions';
import { OAS2Parameters } from './OAS2Parameters';
import { OAS2Responses } from './OAS2Responses';
import { OAS2SecurityRequirement } from './OAS2SecurityRequirement';
import { OAS2Paths } from './OAS2Paths';

export const OAS2Root = {
  name: 'OAS2Root',
  isIdempotent: true,
  properties: {
    info: OAS2Info,
    paths: OAS2Paths,
    definitions: OAS2Definitions,
    parameters: OAS2Parameters,
    responses: OAS2Responses,
    securityDefinitions: OAS2SecurityDefinitions,
    security: OAS2SecurityRequirement,
    externalDocs: OAS2ExternalDocumentation,
    tags: OAS2Tag,

    swagger: null,
    host: null,
    basePath: null,
    schemes: null,
    consumes: null,
    produces: null,
  },
};


export default OAS2Root;
