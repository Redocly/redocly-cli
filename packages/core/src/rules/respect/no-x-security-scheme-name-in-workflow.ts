import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const NoXSecuritySchemeNameInWorkflow: Arazzo1Rule = () => {
  return {
    Workflow: {
      enter(workflow, { report, location }: UserContext) {
        const extendedSecurity = workflow?.['x-security'];

        if (!extendedSecurity) {
          return;
        }

        for (const security of extendedSecurity) {
          if ('schemeName' in security) {
            report({
              message: "The `schemeName` can't be used in Workflow, please use `scheme` instead.",
              location: location.child(['x-security', extendedSecurity.indexOf(security)]),
            });
          }
        }
      },
    },
  };
};
