import type { Oas3Encoding, Oas3MediaType } from '../../typings/openapi.js';
import { type Oas3Rule } from '../../visitors.js';
import { type UserContext } from '../../walk.js';

function reportInvalidEncodingCombination(node: Oas3MediaType | Oas3Encoding, ctx: UserContext) {
  if (
    ('prefixEncoding' in node && 'encoding' in node) ||
    ('itemEncoding' in node && 'encoding' in node)
  ) {
    ctx.report({
      message:
        "The 'encoding' field cannot be used together with 'prefixEncoding' or 'itemEncoding'.",
      location: ctx.location.child('encoding').key(),
      reference: 'https://redocly.com/docs/cli/rules/oas/spec-no-invalid-encoding-combinations',
    });
  }
}

export const SpecNoInvalidEncodingCombinations: Oas3Rule = () => {
  return {
    MediaType: { leave: reportInvalidEncodingCombination },
    Encoding: { leave: reportInvalidEncodingCombination },
  };
};
