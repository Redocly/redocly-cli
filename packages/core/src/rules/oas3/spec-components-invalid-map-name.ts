import { COMPONENT_NAME_PATTERN } from '../../oas-types.js';
import type { Location } from '../../ref-utils.js';
import type { Oas3Rule } from '../../visitors.js';
import type { Problem, UserContext } from '../../walk.js';

export const SpecComponentsInvalidMapName: Oas3Rule = () => {
  function validateKey(
    key: string | number,
    report: (problem: Problem) => void,
    location: Location,
    component: string
  ) {
    if (!new RegExp(COMPONENT_NAME_PATTERN).test(key as string)) {
      report({
        message: `The map key in ${component} "${key}" does not match the regular expression "${COMPONENT_NAME_PATTERN}"`,
        location: location.key(),
        reference: 'https://redocly.com/docs/cli/rules/oas/spec-components-invalid-map-name',
      });
    }
  }

  return {
    NamedSchemas: {
      Schema(_node, { key, report, location }: UserContext) {
        validateKey(key, report, location, 'schemas');
      },
    },
    NamedParameters: {
      Parameter(_node, { key, report, location }: UserContext) {
        validateKey(key, report, location, 'parameters');
      },
    },
    NamedResponses: {
      Response(_node, { key, report, location }: UserContext) {
        validateKey(key, report, location, 'responses');
      },
    },
    NamedExamples: {
      Example(_node, { key, report, location }: UserContext) {
        validateKey(key, report, location, 'examples');
      },
    },
    NamedRequestBodies: {
      RequestBody(_node, { key, report, location }: UserContext) {
        validateKey(key, report, location, 'requestBodies');
      },
    },
    NamedHeaders: {
      Header(_node, { key, report, location }: UserContext) {
        validateKey(key, report, location, 'headers');
      },
    },
    NamedSecuritySchemes: {
      SecurityScheme(_node, { key, report, location }: UserContext) {
        validateKey(key, report, location, 'securitySchemes');
      },
    },
    NamedLinks: {
      Link(_node, { key, report, location }: UserContext) {
        validateKey(key, report, location, 'links');
      },
    },
    NamedCallbacks: {
      Callback(_node, { key, report, location }: UserContext) {
        validateKey(key, report, location, 'callbacks');
      },
    },
  };
};
