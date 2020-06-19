import { OAS3Rule } from '../../visitors';

export const OperationParamtersUnique: OAS3Rule = () => {
  let seenPathParams: Set<string>;
  let seenOperationParams: Set<string>;

  return {
    PathItem: {
      enter(_) {
        seenPathParams = new Set();
      },
      Parameter(parameter, { report, key, parentLocations }) {
        const paramId = `${parameter.in}___${parameter.name}`;
        if (seenPathParams.has(paramId)) {
          report({
            message: `Paths must have unique \`name\` + \`in\` parameters.\nRepeats of \`in:${parameter.in}\` + \`name:${parameter.name}\``,
            location: parentLocations.PathItem.append(['parameters', key]),
          });
        }
        seenPathParams.add(`${parameter.in}___${parameter.name}`);
      },
      Operation: {
        enter() {
          seenOperationParams = new Set();
        },
        Parameter(parameter, { report, key, parentLocations }) {
          const paramId = `${parameter.in}___${parameter.name}`;
          if (seenOperationParams.has(paramId)) {
            report({
              message: `Operations must have unique \`name\` + \`in\` parameters.\nRepeats of \`in:${parameter.in}\` + \`name:${parameter.name}\``,
              location: parentLocations.Operation.append(['parameters', key]),
            });
          }
          seenOperationParams.add(paramId);
        },
      },
    },
  };
};
