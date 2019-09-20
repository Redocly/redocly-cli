import createError from '../error';

import { OpenAPIInfo } from './OpenAPIInfo';
import { OpenAPIPaths } from './OpenAPIPaths';
import OpenAPIComponents from './OpenAPIComponents';
import OpenAPIServer from './OpenAPIServer';
import OpenAPISecurityRequirement from './OpenAPISecurityRequirement';
import OpenAPITag from './OpenAPITag';
import OpenAPIExternalDocumentation from './OpenAPIExternalDocumentation';

export default {
  validators: {
    openapi() {
      return (node, ctx) => {
        if (node && !node.openapi) return createError('The openapi field must be included to the root.', node, ctx);
        return null;
      };
    },
    info() {
      return (node, ctx) => {
        if (node && !node.info) return createError('The info field must be included to the root.', node, ctx);
        return null;
      };
    },
    paths() {
      return (node, ctx) => {
        if (node && !node.paths) return createError('The paths field must be included to the root.', node, ctx);
        return null;
      };
    },
    security() {
      return () => null;
    },
  },
  properties: {
    info: OpenAPIInfo,
    paths: OpenAPIPaths,
    servers: OpenAPIServer,
    components: OpenAPIComponents,
    // security: OpenAPISecurityRequirement,
    tags: OpenAPITag,
    externalDocs: OpenAPIExternalDocumentation,
  },
};
