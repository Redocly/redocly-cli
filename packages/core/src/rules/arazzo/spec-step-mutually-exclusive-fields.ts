import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

const MUTUALLY_EXCLUSIVE_FIELDS = [
  'x-operation',
  'operationId',
  'operationPath',
  'channelPath', // added in Arazzo 1.1
  'workflowId',
];

export const SpecStepMutuallyExclusiveFields: Arazzo1Rule = () => {
  return {
    Step: {
      enter(step, { report, location }: UserContext) {
        const usedFields = MUTUALLY_EXCLUSIVE_FIELDS.filter((field) => Object.hasOwn(step, field));
        if (usedFields.length > 1) {
          report({
            message: `A step can only use one of the following mutually exclusive fields: ${usedFields
              .map((field) => `\`${field}\``)
              .join(', ')}.`,
            location: usedFields.map((field) => location.child([field]).key()),
            reference:
              'https://redocly.com/docs/cli/rules/arazzo/spec-step-mutually-exclusive-fields',
          });
        }
      },
    },
  };
};
