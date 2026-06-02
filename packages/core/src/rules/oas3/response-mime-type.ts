import { validateMimeTypeOAS3 } from '../../utils/validate-mime-type.js';
import type { Oas3Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const ResponseMimeType: Oas3Rule = ({ allowedValues }) => {
  return {
    Paths: {
      Response: {
        leave(response, ctx: UserContext) {
          validateMimeTypeOAS3({
            type: 'produces',
            value: response,
            ctx,
            allowedValues,
            reference: 'https://redocly.com/docs/cli/rules/oas/response-mime-type',
          });
        },
      },
      Callback: {
        Response() {},
        RequestBody: {
          leave(requestBody, ctx: UserContext) {
            validateMimeTypeOAS3({
              type: 'produces',
              value: requestBody,
              ctx,
              allowedValues,
              reference: 'https://redocly.com/docs/cli/rules/oas/response-mime-type',
            });
          },
        },
      },
    },
    WebhooksMap: {
      RequestBody: {
        leave(requestBody, ctx: UserContext) {
          validateMimeTypeOAS3({
            type: 'produces',
            value: requestBody,
            ctx,
            allowedValues,
            reference: 'https://redocly.com/docs/cli/rules/oas/response-mime-type',
          });
        },
      },
    },
  };
};
