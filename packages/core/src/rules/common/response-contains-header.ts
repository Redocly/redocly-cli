import { Oas2Rule, Oas3Rule } from '../../visitors';
import { UserContext } from '../../walk';
import { Oas3Response } from '../../typings/openapi';
import { Oas2Response } from '../../typings/swagger';

export const ResponseContainsHeader: Oas3Rule | Oas2Rule = (options) => {
  const mustExist = options.mustExist || [];
  return {
    Response: {
      skip: (_response: Oas2Response | Oas3Response, key: any) => {
        return !['200', '201', '202'].includes(key.toString());
      },
      enter: (response: Oas2Response | Oas3Response, { report, location }: UserContext) => {
        for (let element of mustExist) {
          if (!response.headers?.[element]) {
            report({
              message: `Response object must have a top-level "${element}" header.`,
              location: location.child('headers'),
            });
          }
        }
      }
    }
  }
};
