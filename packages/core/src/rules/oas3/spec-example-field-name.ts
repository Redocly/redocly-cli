import { Oas3Rule } from '../../visitors';
import { Problem, UserContext } from '../../walk';
import { Location } from '../../ref-utils';

export const SpecExampleFieldName: Oas3Rule = () => {
  const KEYS_REGEX = '^[a-zA-Z0-9.\\-_]+$';

  function checkValidKey(
    key: string | number,
    report: (problem: Problem) => void,
    location: Location
  ) {
    if (!new RegExp(KEYS_REGEX).test(key as string)) {
      report({
        message: `The key of the example "${key}" does not match the regular expression "${KEYS_REGEX}"`,
        location: location.key(),
      });
    }
  }

  return {
    NamedParameters(_node, { key, report, location }: UserContext) {
      checkValidKey(key, report, location);
    },
    NamedExamples(_node, { key, report, location }: UserContext) {
      checkValidKey(key, report, location);
    },
    NamedResponses(_node, { key, report, location }: UserContext) {
      checkValidKey(key, report, location);
    },
    NamedSchemas(_node, { key, report, location }: UserContext) {
      checkValidKey(key, report, location);
    },
    NamedCallbacks(_node, { key, report, location }: UserContext) {
      checkValidKey(key, report, location);
    },
    NamedLinks(_node, { key, report, location }: UserContext) {
      checkValidKey(key, report, location);
    },
    NamedHeaders(_node, { key, report, location }: UserContext) {
      checkValidKey(key, report, location);
    },
    NamedRequestBodies(_node, { key, report, location }: UserContext) {
      checkValidKey(key, report, location);
    },
    NamedSecuritySchemes(_node, { key, report, location }: UserContext) {
      checkValidKey(key, report, location);
    },
  };
};
