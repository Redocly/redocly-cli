import { isPlainObject } from '../../utils/is-plain-object.js';
import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const SourceDescriptionType: Arazzo1Rule = () => {
  return {
    SourceDescriptions: {
      enter(sourceDescriptions, { report, location, specVersion }: UserContext) {
        if (!sourceDescriptions.length) return;
        const allowedTypes =
          specVersion === 'arazzo1' ? ['openapi', 'arazzo'] : ['openapi', 'arazzo', 'asyncapi'];
        for (const sourceDescription of sourceDescriptions) {
          if (!isPlainObject(sourceDescription)) continue;
          const { type } = sourceDescription;
          if (typeof type !== 'string' || !allowedTypes.includes(type)) {
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
