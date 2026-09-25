import type { Oas3Paths } from '../../typings/openapi.js';
import type { Oas2Paths } from '../../typings/swagger.js';
import type { Oas3Rule, Oas2Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

type ParsedPath = {
  path: string;
  segments: string[];
  isVariable: boolean[];
  variableCount: number;
};

export const NoAmbiguousPaths: Oas3Rule | Oas2Rule = () => {
  return {
    Paths(pathMap: Oas3Paths | Oas2Paths, { report, location }: UserContext) {
      // Only paths with the same segment count and variable count can be ambiguous.
      const seenPathsByGroup = new Map<string, ParsedPath[]>();

      for (const currentPath of Object.keys(pathMap)) {
        const parsedPath = parsePath(currentPath);
        const group = `${parsedPath.segments.length}:${parsedPath.variableCount}`;
        let seenPaths = seenPathsByGroup.get(group);
        if (!seenPaths) {
          seenPaths = [];
          seenPathsByGroup.set(group, seenPaths);
        }

        let ambiguousPath: ParsedPath | undefined;
        for (const seenPath of seenPaths) {
          if (arePathsAmbiguous(seenPath, parsedPath)) {
            ambiguousPath = seenPath;
            break;
          }
        }
        if (ambiguousPath) {
          report({
            message: `Paths should resolve unambiguously. Found two ambiguous paths: \`${ambiguousPath.path}\` and \`${currentPath}\`.`,
            location: location.child([currentPath]).key(),
            reference: 'https://redocly.com/docs/cli/rules/oas/no-ambiguous-paths',
          });
        }
        seenPaths.push(parsedPath);
      }
    },
  };
};

function parsePath(path: string): ParsedPath {
  const segments = path.split('/');
  const isVariable: boolean[] = [];
  let variableCount = 0;
  for (const segment of segments) {
    const variable = /^{.+?}$/.test(segment);
    isVariable.push(variable);
    if (variable) {
      variableCount++;
    }
  }
  return { path, segments, isVariable, variableCount };
}

function arePathsAmbiguous(a: ParsedPath, b: ParsedPath) {
  for (let index = 0; index < a.segments.length; index++) {
    if (a.isVariable[index] || b.isVariable[index]) {
      continue;
    }
    if (a.segments[index] !== b.segments[index]) {
      return false;
    }
  }
  return true;
}
