import type { ArazzoRule } from '../../visitors';
import type { UserContext } from '../../walk';

export const StrictSourceDescriptionType: ArazzoRule = () => {
  return {
    SourceDescriptions: {
      enter(SourceDescriptions, { report, location }: UserContext) {
        SourceDescriptions.forEach((sourceDescription: any) => {
          if(!['openapi', 'arazzo'].includes(sourceDescription?.type)) {
            report({
              message: 'The `type` property of the `sourceDescription` object must be either `openapi` or `arazzo`.',
              location: location.key(),
            });
          }
        });
      },
    },
  };
};
