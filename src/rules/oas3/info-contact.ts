import { Oas3Rule } from '../../visitors';
import { missingRequiredField } from '../utils';

export const InfoContact: Oas3Rule = () => {
  return {
    Info(info, { report, location }) {
      if (!info.contact) {
        report({
          message: missingRequiredField('Info', 'contact'),
          location: location.child('contact').key(),
        });
      }
    },
  };
};
