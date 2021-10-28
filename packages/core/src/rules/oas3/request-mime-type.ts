import { Oas3Rule, Oas2Rule } from '../../visitors';
import { UserContext } from '../../walk';

export const RequestMimeType: Oas3Rule | Oas2Rule = ({ allowedValues }) => {
  return {
    RequestBody: {
      leave(requestBody: any, { report, location }: UserContext) {
        if (!allowedValues)
          throw new Error(`Parameter "allowedValues" is not provided for "request-mime-type" rule`);
        for (const mime of Object.keys(requestBody.content)) {
          if (!allowedValues.includes(mime)) {
            report({
              message: `mimeType '${mime}' is not allowed`,
              location: location.child('content').child(mime).key(),
            });
          }
        }
      },
    },
  };
};
