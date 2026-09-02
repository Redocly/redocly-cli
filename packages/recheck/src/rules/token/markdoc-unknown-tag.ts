// Schema-aware "is this even a real tag" check; `markdoc-attributes` validates
// a known tag's attribute list. Detection-only, and only ever a warning: an
// unknown tag is often intentional -- a project's own tag, or one the schema
// generator couldn't statically resolve (see the carve-out below).
//
// `ctx.markdoc.schema` is `null` under `schema: false`, which makes this rule
// inert (parsing and pairing still run). A custom tag declared via
// `extend.tags` is merged into `schema.tags` by `resolveMarkdocConfig` before
// it reaches here, so it validates as known with no extra plumbing.
//
// Only `tag-open`/`tag-self-closing` kinds are checked: real Markdoc raises
// exactly one `tag-undefined` per unknown tag node, at the open, so checking
// the matching close would double-report the same name.
// `annotation`/`variable`/`function` kinds carry no tag name at all and never
// reach Markdoc's tag lookup either way, and `malformed` spans have no
// reliably parseable name and are `markdoc-syntax`'s report already.
import { filterByTypes } from '../../parser/index.js';
import type { TokenRule } from '../types.js';

/**
 * Realm registers `schemaDefinition` inline in its own markdoc options, not in
 * the tag module `scripts/generate-markdoc-schema.mjs` reads, so it can never
 * appear in `MARKDOC_REALM_SCHEMA` even though every Realm build has it.
 * Without this carve-out the rule would warn on an always-valid tag name.
 */
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
  // Bare placeholder: every `onError` call supplies the complete sentence via
  // `context`, so tests can assert whole messages with `toBe`.
  defaults: {
    message: '%s',
  },
  check(ctx) {
    if (!ctx.markdoc) return; // flag off -- no markdocTag tokens exist at all
    const { schema } = ctx.markdoc;
    if (!schema) return; // `schema: false` -- nothing to check tag names against

    // Collected then sorted rather than reported inline: `tree.flat` happens
    // to yield `markdocTag` tokens in document order today, but that is not a
    // guarantee this rule should lean on silently.
    const reports: UnknownTagReport[] = [];

    for (const token of filterByTypes(ctx.tree, ['markdocTag'])) {
      if (token.markdocKind !== 'tag-open' && token.markdocKind !== 'tag-self-closing') continue;

      const nameChild = token.children.find((child) => child.type === 'markdocTagName');
      const name = nameChild?.text;
      if (!name) continue; // defensive only: both kinds always carry a name child

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
