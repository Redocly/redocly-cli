import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const SourceDescriptionType: Arazzo1Rule = () => {
  return {
    SourceDescriptions: {
      enter(sourceDescriptions, { report, location }: UserContext) {
        if (!sourceDescriptions.length) return;
        for (const sourceDescription of sourceDescriptions) {
          if (!['openapi', 'arazzo'].includes(sourceDescription?.type)) {
            report({
              message:
                'The `type` property of the `sourceDescription` object must be either `openapi` or `arazzo`.',
              location: location.child([sourceDescriptions.indexOf(sourceDescription)]),
            });
          }
        }
      },
    },
  };
};
