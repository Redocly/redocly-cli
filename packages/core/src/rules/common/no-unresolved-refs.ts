import { YamlParseError } from '../../errors/yaml-parse-error.js';
import { isMappingRef, type Location } from '../../ref-utils.js';
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
  let componentsSchemaNames: string[] = [];

  return {
    Root: {
      enter(root: { components?: { schemas?: Record<string, unknown> } }) {
        componentsSchemaNames = Object.keys(root.components?.schemas || {});
      },
    },
    ref: {
      leave(_, { report, location }, resolved) {
        if (resolved.node !== undefined) return;
        reportUnresolvedRef(resolved, report, location);
      },
    },
    DiscriminatorMapping(mapping: Record<string, string>, { report, location }: UserContext) {
      for (const mappingName of Object.keys(mapping)) {
        const mappingValue = mapping[mappingName];
        // refs are walked as $ref and checked by the ref visitor above, other values are schema names
        if (isMappingRef(mappingValue) || componentsSchemaNames.includes(mappingValue)) continue;

        report({
          message: `Discriminator mapping value '${mappingValue}' does not point to an existing schema component.`,
          location: location.child(mappingName),
          reference: 'https://redocly.com/docs/cli/rules/oas/no-unresolved-refs',
        });
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
    reference: 'https://redocly.com/docs/cli/rules/oas/no-unresolved-refs',
  });
}
