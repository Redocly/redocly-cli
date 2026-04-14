import type { ExtendedSecurity } from '../../typings/arazzo.js';
import { getOwn } from '../../utils/get-own.js';
import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const NoXSecurityBothSchemeAndSchemeName: Arazzo1Rule = () => {
  function validate(
    extendedSecurity: ExtendedSecurity[] | undefined,
    { report, location }: UserContext
  ) {
    if (!Array.isArray(extendedSecurity)) return;

    for (const security of extendedSecurity) {
      const hasScheme = getOwn(security, 'scheme');
      const hasSchemeName = getOwn(security, 'schemeName');

      if (hasScheme && hasSchemeName) {
        report({
          message: '`x-security` item must not contain both `scheme` and `schemeName`.',
          location: location.child(['x-security', extendedSecurity.indexOf(security)]),
        });
      }
    }
  }

  return {
    Workflow: {
      enter(workflow, context) {
        validate(workflow?.['x-security'], context);
      },
    },
    Step: {
      enter(step, context) {
        validate(step?.['x-security'], context);
      },
    },
  };
};
