import { Oas3Transformer } from '../../visitors';
import { isMappingRef } from '../../ref-utils';

export const DiscriminatorMappingToOneOf: Oas3Transformer = () => {
  return {
    Schema(schema) {
      const mapping = schema.discriminator && schema.discriminator.mapping;
      if (!mapping || schema.oneOf || schema.anyOf) return;

      schema.anyOf = Object.values(mapping).filter(isMappingRef).map($ref => ({
        $ref
      }))
    },
  };
};
