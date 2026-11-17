import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

const OUTPUT_NAME_PATTERN = /^[a-zA-Z0-9_.-]+$/;

export const SpecOutputsInvalidMapName: Arazzo1Rule = () => {
  return {
    Outputs: {
      enter(outputs, { report, location }: UserContext) {
        for (const outputName of Object.keys(outputs)) {
          if (!OUTPUT_NAME_PATTERN.test(outputName)) {
            report({
              message: `The output name "${outputName}" does not match the regular expression "${OUTPUT_NAME_PATTERN.source}".`,
              location: location.child([outputName]).key(),
              reference: 'https://redocly.com/docs/cli/rules/arazzo/spec-outputs-invalid-map-name',
            });
          }
        }
      },
    },
  };
};
