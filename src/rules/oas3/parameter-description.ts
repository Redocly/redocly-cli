import { OAS3Rule } from '../../visitors';

export const ParameterDescription: OAS3Rule = () => {
  return {
    Parameter(parameter, { report, location }) {
      if (parameter.description === undefined) {
        report({
          message: 'Parameter object description must be present.',
          location: { reportOnKey: true },
        });
      } else if (!parameter.description) {
        report({
          message: 'Parameter object description must be non-empty string.',
          location: location.append(['description']),
        });
      }
    },
  };
};
