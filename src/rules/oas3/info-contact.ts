import { Oas3Rule } from '../../visitors';
import { missingRequiredField } from '../utils';

export const InfoContact: Oas3Rule = () => {
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
