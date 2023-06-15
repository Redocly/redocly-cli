import { buildNameUniqueRule } from './base-name-unique';
import { Oas2Rule, Oas3Rule } from '../../visitors';
import { Oas3Schema } from '../../typings/openapi';
import { UserContext } from '../../walk';

export const ResponseNameUnique: Oas3Rule | Oas2Rule = buildNameUniqueRule(
  'Response',
  (addComponentFromAbsoluteLocation) => ({
    NamedResponses: {
      Response(_: Oas3Schema, { location }: UserContext) {
        addComponentFromAbsoluteLocation(location.absolutePointer.toString());
      },
    },
  })
);
