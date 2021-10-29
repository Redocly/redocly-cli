import { Oas3Rule } from '../../visitors';
import { UserContext } from '../../walk';
import { Oas3RequestBody, Oas3Response } from '../../typings/openapi';
import { validateMimeTypeOAS3 } from '../../utils';

export const RequestMimeType: Oas3Rule = ({ allowedValues }) => {
  return {
    PathMap: {
      RequestBody: {
        leave(requestBody: Oas3RequestBody, ctx: UserContext) {
          validateMimeTypeOAS3({ type: 'consumes', value: requestBody }, ctx, allowedValues);
        },
      },
      Callback: {
        RequestBody() {},
        Response: {
          leave(response: Oas3Response, ctx: UserContext) {
            validateMimeTypeOAS3({ type: 'consumes', value: response }, ctx, allowedValues);
          },
        },
      },
    },
    WebhooksMap: {
      Response: {
        leave(response: Oas3Response, ctx: UserContext) {
          validateMimeTypeOAS3({ type: 'consumes', value: response }, ctx, allowedValues);
        },
      },
    },
  };
};
