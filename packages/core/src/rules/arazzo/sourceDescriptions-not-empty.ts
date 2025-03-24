import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const SourceDescriptionsNotEmpty: Arazzo1Rule = () => {
  return {
    SourceDescriptions: {
      enter(sourceDescriptions, { report, location }: UserContext) {
        if (!sourceDescriptions?.length) {
          report({
            message: 'The `sourceDescriptions` list must have at least one entry.',
            location,
          });
        }
      },
    },
  };
};
