import { detectSpec } from '../../oas-types.js';
import { validateDefinedAndNonEmpty, validateOneOfDefinedAndNonEmpty } from '../utils.js';

import type { Oas3Rule, Oas2Rule, Async2Rule, Async3Rule } from '../../visitors.js';

export const InfoLicenseStrict: Oas2Rule | Oas3Rule | Async2Rule | Async3Rule = () => {
  let specVersion: string | undefined;
  return {
    Root: {
      enter(root: any) {
        specVersion = detectSpec(root);
      },
      License: {
        leave(license, ctx) {
          if (specVersion === 'oas3_1' || specVersion === 'oas3_2') {
            validateOneOfDefinedAndNonEmpty(['url', 'identifier'], license, ctx);
          } else {
            validateDefinedAndNonEmpty('url', license, ctx);
          }
        },
      },
    },
  };
};
