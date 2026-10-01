// Warns about Markdoc tags that are not in the schema (`markdoc-attributes` checks the
// attributes of known tags). Only a warning, because an unknown tag is often intentional,
// such as a project's own tag. Does nothing under `schema: false`. Tags added with
// `extend.tags` count as known. Only open and self-closing tags are checked, so a tag is
// not reported twice.
import { filterByTypes } from '../../parser/index.js';
import type { TokenRule } from '../types.js';

/** Realm registers `schemaDefinition` inline, so it never appears in the generated schema. */
const KNOWN_UNKNOWN_TAGS: ReadonlySet<string> = new Set(['schemaDefinition']);

interface UnknownTagReport {
  line: number;
  column: number;
  context: string;
}

export const markdocUnknownTag: TokenRule = {
  name: 'markdoc-unknown-tag',
  tags: ['markdoc'],
  fixable: false,
  defaults: {
    message: '%s',
  },
  check(ctx) {
    if (!ctx.markdoc) return; // markdoc parsing is off
    const { schema } = ctx.markdoc;
    if (!schema) return; // `schema: false` -- nothing to check tag names against

    // Sort the reports into document order.
    const reports: UnknownTagReport[] = [];

    for (const token of filterByTypes(ctx.tree, ['markdocTag'])) {
      if (token.markdocKind !== 'tag-open' && token.markdocKind !== 'tag-self-closing') continue;

      const nameChild = token.children.find((child) => child.type === 'markdocTagName');
      const name = nameChild?.text;
      if (!name) continue;

      if (schema.tags[name] || KNOWN_UNKNOWN_TAGS.has(name)) continue;

      reports.push({
        line: token.startLine,
        column: token.startColumn,
        context: `"${name}" is not a known Markdoc tag — check for a typo, or declare it via "extend.tags" if intentional`,
      });
    }

    reports.sort((a, b) => a.line - b.line || a.column - b.column);
    for (const report of reports) ctx.onError(report);
  },
};
