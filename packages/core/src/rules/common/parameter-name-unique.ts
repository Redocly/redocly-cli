import { buildNameUniqueRule } from './base-name-unique';
import { Oas2Rule, Oas3Rule } from '../../visitors';
import { Oas3Schema } from '../../typings/openapi';
import { UserContext } from '../../walk';

// TODO create the documentation file (.md)
// TODO create tests
// TODO add in places needed
export const ParameterNameUnique: Oas3Rule | Oas2Rule = buildNameUniqueRule(
  'Schema',
  (addComponentFromAbsoluteLocation) => ({
    NamedParameters: {
      Schema(_: Oas3Schema, { location }: UserContext) {
        addComponentFromAbsoluteLocation(location.absolutePointer.toString());
      },
    },
  })
);
