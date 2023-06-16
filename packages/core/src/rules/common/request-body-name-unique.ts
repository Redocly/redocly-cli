import { buildNameUniqueRule } from './base-name-unique';
import { Oas2Rule, Oas3Rule } from '../../visitors';
import { Oas3RequestBody } from '../../typings/openapi';
import { UserContext } from '../../walk';

export const RequestBodyNameUnique: Oas3Rule | Oas2Rule = buildNameUniqueRule(
  'RequestBody',
  (addComponentFromAbsoluteLocation) => ({
    NamedRequestBodies: {
      RequestBody(_: Oas3RequestBody, { location }: UserContext) {
        addComponentFromAbsoluteLocation(location.absolutePointer.toString());
      },
    },
  })
);
