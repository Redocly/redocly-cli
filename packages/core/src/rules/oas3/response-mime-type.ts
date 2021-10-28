import { Oas3Rule } from '../../visitors';
import { UserContext } from '../../walk';
import { Oas3Response } from '../../typings/openapi';

export const ResponseMimeType: Oas3Rule = ({ allowedValues }) => {
  return {
    Response: {
      leave(response: Oas3Response, { report, location }: UserContext) {
        if (!allowedValues)
          throw new Error(
            `Parameter "allowedValues" is not provided for "response-mime-type" rule`,
          );
        if (!response.content) return;
        for (const mime of Object.keys(response.content)) {
          if (!allowedValues.includes(mime)) {
            report({
              message: `Mime type "${mime}" is not allowed`,
              location: location.child('content').child(mime).key(),
            });
          }
        }
      },
    },
  };
};
