import { validateMimeTypeOAS3 } from '../../utils/validate-mime-type.js';
import type { Oas3Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const RequestMimeType: Oas3Rule = ({ allowedValues }) => {
  return {
    Paths: {
      RequestBody: {
        leave(requestBody, ctx: UserContext) {
          validateMimeTypeOAS3({
            type: 'consumes',
            value: requestBody,
            ctx,
            allowedValues,
            reference: 'https://redocly.com/docs/cli/rules/oas/request-mime-type',
          });
        },
      },
      Callback: {
        RequestBody() {},
        Response: {
          leave(response, ctx: UserContext) {
            validateMimeTypeOAS3({
              type: 'consumes',
              value: response,
              ctx,
              allowedValues,
              reference: 'https://redocly.com/docs/cli/rules/oas/request-mime-type',
            });
          },
        },
      },
    },
    WebhooksMap: {
      Response: {
        leave(response, ctx: UserContext) {
          validateMimeTypeOAS3({
            type: 'consumes',
            value: response,
            ctx,
            allowedValues,
            reference: 'https://redocly.com/docs/cli/rules/oas/request-mime-type',
          });
        },
      },
    },
  };
};
