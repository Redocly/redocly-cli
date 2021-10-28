import { Oas3Rule } from '../../visitors';
import { UserContext } from '../../walk';
import { Oas3RequestBody, Oas3Response } from '../../typings/openapi';

export const RequestMimeType: Oas3Rule = ({ allowedValues }) => {
  return {
    RequestBody: {
      leave(requestBody: Oas3RequestBody, { report, location }: UserContext) {
        if (!allowedValues)
          throw new Error(`Parameter "allowedValues" is not provided for "request-mime-type" rule`);
        if (!requestBody.content) return;

        for (const mime of Object.keys(requestBody.content)) {
          if (!allowedValues.includes(mime)) {
            report({
              message: `Mime type "${mime}" is not allowed`,
              location: location.child('content').child(mime).key(),
            });
          }
        }
      },
    },
    Callback: {
      Response: {
        leave(response: Oas3Response, { report, location }: UserContext) {
          if (!allowedValues)
            throw new Error(
              `Parameter "allowedValues" is not provided for "request-mime-type" rule`,
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
    },
  };
};
