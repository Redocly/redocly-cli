import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const NoStepRequestBodyWithWorkflowId: Arazzo1Rule = () => {
  return {
    Step: {
      enter(step, { report, location }: UserContext) {
        if (step.workflowId === undefined || step.requestBody === undefined) return;

        report({
          message:
            'The `requestBody` of a step that uses `workflowId` is not passed to the workflow. Use `parameters` to pass inputs to the workflow.',
          location: location.child(['requestBody']).key(),
          reference:
            'https://redocly.com/docs/cli/rules/arazzo/no-step-requestbody-with-workflowid',
        });
      },
    },
  };
};
