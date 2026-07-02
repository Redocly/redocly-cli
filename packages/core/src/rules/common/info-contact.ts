import type { Oas3Rule, Oas2Rule } from '../../visitors.js';
import { missingRequiredField } from '../utils.js';

export const InfoContact: Oas3Rule | Oas2Rule = () => {
  return {
    Info(info, { report, location }) {
      if (!info.contact) {
        report({
          message: missingRequiredField('Info', 'contact'),
          location: location.child('contact').key(),
          reference: 'https://redocly.com/docs/cli/rules/oas/info-contact',
        });
      }
    },
  };
};
