import type { ArazzoRule } from '../../visitors';
import type { UserContext } from '../../walk';

export const SourceDescriptionType: ArazzoRule = () => {
  return {
    SourceDescriptions: {
      enter(SourceDescriptions, { report, location }: UserContext) {
        for (const sourceDescription of SourceDescriptions) {
          if (!['openapi', 'arazzo'].includes(sourceDescription?.type)) {
            report({
              message:
                'The `type` property of the `sourceDescription` object must be either `openapi` or `arazzo`.',
              location: location.child([SourceDescriptions.indexOf(sourceDescription)]),
            });
          }
        }
      },
    },
  };
};
