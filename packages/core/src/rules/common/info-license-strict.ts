import { detectSpec } from '../../detect-spec.js';
import type { Oas3Rule, Oas2Rule, Async2Rule, Async3Rule } from '../../visitors.js';
import { validateDefinedAndNonEmpty, validateOneOfDefinedAndNonEmpty } from '../utils.js';

export const InfoLicenseStrict: Oas2Rule | Oas3Rule | Async2Rule | Async3Rule = () => {
  let specVersion: string | undefined;
  return {
    Root: {
      enter(root: any) {
        specVersion = detectSpec(root);
      },
      License: {
        leave(license, ctx) {
          if (specVersion === 'oas3_1' || specVersion === 'oas3_2') {
            validateOneOfDefinedAndNonEmpty({
              fieldNames: ['url', 'identifier'],
              value: license,
              ctx,
              reference: 'https://redocly.com/docs/cli/rules/oas/info-license-strict',
            });
          } else {
            validateDefinedAndNonEmpty({
              fieldName: 'url',
              value: license,
              ctx,
              reference: 'https://redocly.com/docs/cli/rules/oas/info-license-strict',
            });
          }
        },
      },
    },
  };
};
