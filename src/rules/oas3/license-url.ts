import { Oas3Rule } from '../../visitors';
import { validateDefinedAndNonEmpty } from '../utils';

export const InfoLicenseUrl: Oas3Rule = () => {
  return {
    License(license, ctx) {
      validateDefinedAndNonEmpty('url', license, ctx);
    },
  };
};
