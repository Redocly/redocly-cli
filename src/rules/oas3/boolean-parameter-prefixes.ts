import { Oas3Rule } from '../../visitors';

export const BooleanParameterPrefixes: Oas3Rule = () => {
  return {
    Parameter: {
      Schema(schema, { report, parentLocations }, parents) {
        if (schema.type === 'boolean' && !/^(is|has)[A-Z]/.test(parents.Parameter.name)) {
          report({
            message: `Boolean parameter ${parents.Parameter.name} should have a \`is\` or \`has\` prefix`,
            location: parentLocations.Parameter.child(['name']),
          });
        }
      },
    },
  };
};
