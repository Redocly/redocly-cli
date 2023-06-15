import { buildNameUniqueRule } from './base-name-unique';
import { Oas2Rule, Oas3Rule } from '../../visitors';
import { Oas3Parameter } from '../../typings/openapi';
import { UserContext } from '../../walk';

// TODO create the documentation file (.md)
export const ParameterNameUnique: Oas3Rule | Oas2Rule = buildNameUniqueRule(
  'Parameter',
  (addComponentFromAbsoluteLocation) => ({
    NamedParameters: {
      Parameter(_: Oas3Parameter, { location }: UserContext) {
        addComponentFromAbsoluteLocation(location.absolutePointer.toString());
      },
    },
  })
);
