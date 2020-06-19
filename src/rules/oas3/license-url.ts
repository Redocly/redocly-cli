import { OAS3Rule } from '../../visitors';
import { missingRequiredField } from '../utils';

export const InfoLicenseUrl: OAS3Rule = () => {
  return {
    License(license, { report, location }) {
      if (typeof license !== 'object') return;
      if (!license.url) {
        report({
          message: missingRequiredField('License', 'url'),
          location: { reportOnKey: true },
        });
      }
    },
  };
};
