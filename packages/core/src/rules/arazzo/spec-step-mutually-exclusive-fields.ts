import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

const MUTUALLY_EXCLUSIVE_FIELDS_1_0 = ['x-operation', 'operationId', 'operationPath', 'workflowId'];
const MUTUALLY_EXCLUSIVE_FIELDS_1_1 = [
  'x-operation',
  'operationId',
  'operationPath',
  'channelPath',
  'workflowId',
];

export const SpecStepMutuallyExclusiveFields: Arazzo1Rule = () => {
  return {
    Step: {
      enter(step, { report, location, specVersion }: UserContext) {
        const fields =
          specVersion === 'arazzo1_1'
            ? MUTUALLY_EXCLUSIVE_FIELDS_1_1
            : MUTUALLY_EXCLUSIVE_FIELDS_1_0;
        const usedFields = fields.filter((field) =>
          Object.prototype.hasOwnProperty.call(step, field)
        );
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
