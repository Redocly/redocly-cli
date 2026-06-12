import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const SourceDescriptionType: Arazzo1Rule = () => {
  return {
    SourceDescriptions: {
      enter(sourceDescriptions, { report, location, specVersion }: UserContext) {
        if (!sourceDescriptions.length) return;
        const allowedTypes =
          specVersion === 'arazzo1_1' ? ['openapi', 'arazzo', 'asyncapi'] : ['openapi', 'arazzo'];
        for (const sourceDescription of sourceDescriptions) {
          if (!allowedTypes.includes(sourceDescription?.type)) {
            report({
              message: `The \`type\` property of the \`sourceDescription\` object must be either ${allowedTypes
                .map((t) => `\`${t}\``)
                .join(' or ')}.`,
              location: location.child([sourceDescriptions.indexOf(sourceDescription)]),
              reference: 'https://redocly.com/docs/cli/rules/arazzo/sourcedescription-type',
            });
          }
        }
      },
    },
  };
};
