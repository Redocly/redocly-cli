import { YamlParseError } from '../../errors/yaml-parse-error.js';
import type { Location } from '../../ref-utils.js';
import type {
  Oas2Rule,
  Oas3Rule,
  Async2Rule,
  Async3Rule,
  Arazzo1Rule,
  Overlay1Rule,
} from '../../visitors.js';
import type { ResolveResult, Problem, UserContext } from '../../walk.js';

export const NoUnresolvedRefs:
  | Oas3Rule
  | Oas2Rule
  | Async2Rule
  | Async3Rule
  | Arazzo1Rule
  | Overlay1Rule = () => {
  return {
    ref: {
      leave(_, { report, location }, resolved) {
        if (resolved.node !== undefined) return;
        reportUnresolvedRef(resolved, report, location);
      },
    },
    DiscriminatorMapping(
      mapping: Record<string, string>,
      { report, resolve, location }: UserContext
    ) {
      for (const mappingName of Object.keys(mapping)) {
        const resolved = resolve({ $ref: mapping[mappingName] });
        if (resolved.node !== undefined) return;

        reportUnresolvedRef(resolved, report, location.child(mappingName));
      }
    },
  };
};

export function reportUnresolvedRef(
  resolved: ResolveResult<any>,
  report: (m: Problem) => void,
  location: Location
) {
  const error = resolved.error;
  if (error instanceof YamlParseError) {
    report({
      message: 'Failed to parse: ' + error.message,
      location: {
        source: error.source,
        pointer: undefined,
        start: {
          col: error.col,
          line: error.line,
        },
      },
    });
  }

  const message = resolved.error?.message;

  report({
    location,
    message: `Can't resolve $ref${message ? ': ' + message : ''}`,
  });
}
