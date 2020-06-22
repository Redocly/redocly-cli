import { Oas3Rule } from '../visitors';
import { YamlParseError } from '../resolve';
import { ResolveResult, ReportMessage } from '../walk';

export const NoUnresolvedRefs: Oas3Rule = () => {
  return {
    ref(_, { report }, resolved) {
      if (resolved.node !== undefined) return;
      reportUnresolvedRef(resolved, report);
    },
  };
};

export function reportUnresolvedRef(resolved: ResolveResult<any>, report: (m: ReportMessage) => void) {
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

  report({
    message: `Can't resolve $ref: ${resolved.error?.message}`,
  });
}

