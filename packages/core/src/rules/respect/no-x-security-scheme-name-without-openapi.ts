import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const NoXSecuritySchemeNameWithoutOpenAPI: Arazzo1Rule = () => {
  return {
    Step: {
      enter(step, { report, location }: UserContext) {
        const hasExtendedOperation = step?.['x-operation'];

        if (!hasExtendedOperation) {
          return;
        }

        const extendedSecurity = step?.['x-security'];

        if (!extendedSecurity) {
          return;
        }

        for (const security of extendedSecurity) {
          if ('schemeName' in security) {
            report({
              message:
                'The `schemeName` can be only used in Step with OpenAPI operation, please use `scheme` instead.',
              location: location.child(['x-security', extendedSecurity.indexOf(security)]),
            });
          }
        }
      },
    },
  };
};
