import { detectSpec } from '../../oas-types';
import { Oas3Rule, Oas2Rule, Async2Rule, Async3Rule } from '../../visitors';
import { validateDefinedAndNonEmpty, validateOneOfDefinedAndNonEmpty } from '../utils';

export const InfoLicenseStrict: Oas2Rule | Oas3Rule | Async2Rule | Async3Rule = () => {
  let specVersion: string | undefined;
  return {
    Root: {
      enter(root: any) {
        specVersion = detectSpec(root);
      },
      License: {
        leave(license, ctx) {
          if (specVersion === 'oas3_1') {
            validateOneOfDefinedAndNonEmpty(['url', 'license'], license, ctx);
          } else {
            validateDefinedAndNonEmpty('url', license, ctx);
          }
        },
      },
    },
  };
};
