import type { Async2Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';
import { createSecuritySchemeReferencesChecker } from '../common/security-scheme-references.js';

export const AsyncApiOperationSecurityDefined: Async2Rule = () => {
  const checker = createSecuritySchemeReferencesChecker();

  return {
    Root: {
      leave(_root: unknown, ctx: UserContext) {
        checker.reportUndefinedSchemes(ctx);
      },
    },
    ...checker.visitors,
  };
};
