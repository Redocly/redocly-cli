/* eslint-disable import/no-cycle */
import traverseNode from '../traverse';
import OpenAPISchema from './OpenAPISchema';

export const MAPPING_DATA_KEY = 'x-openapiCli_resolveMappingData';

export default {
  name: 'OpenAPIDiscriminator',
  isIdempotent: true,
  properties: {
    propertyName: null,
    mapping: null,
  },
  customResolveFields: async (node, ctx, visited) => {
    if (node && node.mapping && typeof node.mapping === 'object') {
      ctx.path.push('mapping');
      for (const key of Object.keys(node.mapping)) {
        ctx.path.push(key);
        await traverseNode(
          {
            $ref: node.mapping[key],
            [MAPPING_DATA_KEY]: { // FIXME: too hacky
              mapping: node.mapping,
              key,
            },
          },
          OpenAPISchema,
          ctx,
          visited,
        );
        ctx.path.pop();
      }
      ctx.path.pop();
    }
  },
};
