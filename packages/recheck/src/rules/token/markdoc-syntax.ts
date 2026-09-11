// Grammar-level Markdoc syntax validation -- detection-only. Uses
// `markdocKind` as a cheap short-circuit, then re-parses each tag's own text
// via `parseMarkdocSpan` for the semantic detail the `Token` never retains:
// the parse `reason` and each attribute/primary's `valueKind`. Re-parsing
// keeps this rule from forcing a `reason`/`attributes` field onto the `Token`
// shape that it would be the only consumer of.
//
// Every check here is GRAMMAR-level, so it fires the same way on a custom tag
// and under `schema: false` as under the realm schema -- real Markdoc rejects
// these shapes regardless of any schema. That is why this rule never reads
// `ctx.markdoc.schema`, only the flag-is-on signal.
//
// Reports:
// - `malformed` spans, with the parser's `reason`, positioned at the offending
//   character when `reasonOffset` gives one.
// - close tags carrying attributes: Markdoc's close-tag production is `'/'
//   TagName` only, but recheck's span parser parses an attribute list anyway,
//   so this rule is what surfaces it.
// - bareword values in an attribute OR the positional `primary` slot, both
//   critical parse errors upstream. `primary` is checked as its own field
//   because iterating `attributes` alone would miss it.
//
// Deliberately never reports: `{%- -%}` trim markers (stripped before parsing
// sees them), glued attributes (`a=1b=2`, parsed as two attributes),
// duplicate attributes (`markdoc-attributes` owns the class/id-fold-aware
// version), or annotation/variable/function kinds (out of scope; skipped
// explicitly below rather than relying on their attribute lists being empty).
import { filterByTypes } from '../../parser/index.js';
import { parseMarkdocSpan } from '../../parser/markdoc/span.js';
import { offsetToPosition } from '../../parser/markdoc/structure.js';
import type { TokenRule } from '../types.js';

export const markdocSyntax: TokenRule = {
  name: 'markdoc-syntax',
  tags: ['markdoc'],
  fixable: false,
  defaults: {
    message: 'Markdoc syntax error',
  },
  check(ctx) {
    // Flag off: no `markdocTag` tokens exist in the tree at all, so this is a
    // defensive no-op rather than something the loop below must handle.
    if (!ctx.markdoc) return;

    for (const token of filterByTypes(ctx.tree, ['markdocTag'])) {
      // Annotation/variable/function bodies are out of scope. Skipping up
      // front is cheaper and clearer than relying on their attribute lists
      // coming back empty.
      if (
        token.markdocKind === 'annotation' ||
        token.markdocKind === 'variable' ||
        token.markdocKind === 'function'
      ) {
        continue;
      }

      const parsed = parseMarkdocSpan(token.text);

      if (parsed.kind === 'malformed') {
        // `reasonOffset` is relative to the span text, so it is converted to
        // a document position instead of quoted in the message -- a
        // span-relative "at position 7" next to the report's own absolute
        // column reads as a contradiction. When the scanner had no single
        // offending position (empty body, missing delimiter), the tag's own
        // start stands in.
        const position =
          parsed.reasonOffset === undefined
            ? { line: token.startLine, column: token.startColumn }
            : offsetToPosition(token, parsed.reasonOffset);
        ctx.onError({
          line: position.line,
          column: position.column,
          context: token.text,
          detail: parsed.reason,
        });
        continue; // malformed spans carry no attributes/primary to check further
      }

      // Reported at the first attribute's own position when that synthesized
      // child exists, falling back to the tag's start.
      if (parsed.kind === 'tag-close' && parsed.attributes.length > 0) {
        const firstAttribute = token.children.find((child) => child.type === 'markdocAttribute');
        const position = firstAttribute ?? token;
        ctx.onError({
          line: position.startLine,
          column: position.startColumn,
          context: token.text,
          detail: `close tag "{% /${parsed.name} %}" must not carry attributes — Markdoc's close-tag syntax accepts none`,
        });
        // Stop here: the fix just reported is to delete the whole attribute
        // list, so also advising a reader to quote a bareword inside it would
        // contradict that.
        continue;
      }

      // Primary is checked before the attribute loop because it sits right
      // after the tag name, so its offset is always the earlier one. This rule
      // emits as it goes and never sorts, so check order is emission order.
      if (parsed.primary?.valueKind === 'bareword' && parsed.name !== null) {
        const primaryToken = token.children.find((child) => child.type === 'markdocTagPrimary');
        const position = primaryToken ?? token;
        ctx.onError({
          line: position.startLine,
          column: position.startColumn,
          context: token.text,
          detail: `quote the value: {% ${parsed.name} "${String(parsed.primary.value)}" %}`,
        });
      }

      // structure.ts synthesizes attribute children in the same source order
      // as `parsed.attributes`, so index-aligning the two arrays is safe and
      // reuses the offset-to-position math structure.ts already did.
      const attributeTokens = token.children.filter((child) => child.type === 'markdocAttribute');
      parsed.attributes.forEach((attribute, index) => {
        if (attribute.valueKind !== 'bareword') return;
        const valueToken = attributeTokens[index]?.children.find(
          (child) => child.type === 'markdocAttributeValue'
        );
        const position = valueToken ?? token;
        ctx.onError({
          line: position.startLine,
          column: position.startColumn,
          context: token.text,
          detail: `quote the value: ${attribute.name}="${String(attribute.value)}"`,
        });
      });
    }
  },
};
