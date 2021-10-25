import { Oas3Rule, Oas2Rule } from '../../visitors';
import { UserContext } from '../../walk';

export const RequestMimeType: Oas3Rule | Oas2Rule = ({ allowedValues }) => {
  return {
    RequestBody: {
      leave(requestBody: any, { report, location }: UserContext) {
        for (const mime of Object.keys(requestBody.content)) {
          if (!allowedValues.includes(mime)) {
            report({
              message: `mimeType '${mime}' is not allowed`,
              location: location.child('requestBody'),
            });
          }
        }
      },
    },
  };
};
