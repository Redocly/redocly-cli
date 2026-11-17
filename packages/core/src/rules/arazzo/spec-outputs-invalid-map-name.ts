import { COMPONENT_NAME_CHARS } from '../../oas-types.js';
import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

const OUTPUT_NAME_PATTERN = new RegExp(`^[${COMPONENT_NAME_CHARS}]+$`);

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
