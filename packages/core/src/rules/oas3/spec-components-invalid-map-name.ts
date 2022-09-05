import { Oas3Rule } from '../../visitors';
import { Problem, UserContext } from '../../walk';
import { Location } from '../../ref-utils';

export const SpecComponentsInvalidMapName: Oas3Rule = () => {
  const KEYS_REGEX = '^[a-zA-Z0-9\\.\\-_]+$';

  function validateKey(
    key: string | number,
    report: (problem: Problem) => void,
    location: Location,
    component: string
  ) {
    if (!new RegExp(KEYS_REGEX).test(key as string)) {
      report({
        message: `The map key in ${component} "${key}" does not match the regular expression "${KEYS_REGEX}"`,
        location: location.key(),
      });
    }
  }

  return {
    Components: {
      Parameter(_node, { key, report, location }: UserContext) {
        validateKey(key, report, location, 'parameters');
      },
      Response(_node, { key, report, location }: UserContext) {
        validateKey(key, report, location, 'responses');
      },
      Schema(_node, { key, report, location }: UserContext) {
        validateKey(key, report, location, 'schemas');
      },
      Example(_node, { key, report, location }: UserContext) {
        validateKey(key, report, location, 'examples');
      },
      RequestBody(_node, { key, report, location }: UserContext) {
        validateKey(key, report, location, 'requestBodies');
      },
      Header(_node, { key, report, location }: UserContext) {
        validateKey(key, report, location, 'headers');
      },
      SecurityScheme(_node, { key, report, location }: UserContext) {
        validateKey(key, report, location, 'securitySchemas');
      },
      Link(_node, { key, report, location }: UserContext) {
        validateKey(key, report, location, 'links');
      },
      Callback(_node, { key, report, location }: UserContext) {
        validateKey(key, report, location, 'callbacks');
      },
    },
  };
};
