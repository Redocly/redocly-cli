import { Oas3Rule } from '../../visitors';
import { UserContext } from '../../walk';
import { Oas3RequestBody, Oas3Response } from '../../typings/openapi';
import { validateMimeTypeOAS3 } from '../../utils';

export const ResponseMimeType: Oas3Rule = ({ allowedValues }) => {
  return {
    PathMap: {
      Response: {
        leave(response: Oas3Response, ctx: UserContext) {
          validateMimeTypeOAS3({ type: 'produces', value: response }, ctx, allowedValues);
        },
      },
      Callback: {
        Response() {},
        RequestBody: {
          leave(requestBody: Oas3RequestBody, ctx: UserContext) {
            validateMimeTypeOAS3({ type: 'produces', value: requestBody }, ctx, allowedValues);
          },
        },
      },
    },
    WebhooksMap: {
      RequestBody: {
        leave(requestBody: Oas3RequestBody, ctx: UserContext) {
          validateMimeTypeOAS3({ type: 'produces', value: requestBody }, ctx, allowedValues);
        },
      },
    },
  };
};
