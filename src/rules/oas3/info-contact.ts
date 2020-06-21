import { OAS3Rule } from '../../visitors';
import { missingRequiredField } from '../utils';

export const InfoContact: OAS3Rule = () => {
  return {
    Info(info, { report }) {
      if (!info.contact) {
        report({
          message: missingRequiredField('Info', 'contact'),
          location: { reportOnKey: true },
        });
      }
    },
  };
};
