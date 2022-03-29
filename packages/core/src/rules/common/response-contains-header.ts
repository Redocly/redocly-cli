import { Oas2Rule, Oas3Rule } from '../../visitors';
import { UserContext } from '../../walk';
import { Oas3Response } from '../../typings/openapi';
import { Oas2Response } from '../../typings/swagger';
import { generalizeResponseStatusCode } from '../../utils';

export const ResponseContainsHeader: Oas3Rule | Oas2Rule = (options) => {
  const names: Record<string, string[]> = options.names || {};
  return {
    Operation: {
      Response: {
        enter: (response: Oas2Response | Oas3Response, { report, location, key }: UserContext) => {
          const expectedHeaders = names[key] || names[generalizeResponseStatusCode(key)] || [];
          for (const expectedHeader of expectedHeaders) {
            if (!response.headers?.[expectedHeader]) {
              report({
                message: `Response object must have a "${expectedHeader}" header.`,
                location: location.child('headers'),
              });
            }
          }
        },
      },
    },
  };
};
