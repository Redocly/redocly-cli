import { validateDefinedAndNonEmpty } from '../utils.js';

import type { Oas3Rule, Oas2Rule } from '../../visitors.js';

export const InfoLicenseUrl: Oas3Rule | Oas2Rule = () => {
  return {
    License(license, ctx) {
      validateDefinedAndNonEmpty('url', license, ctx);
    },
  };
};
