// Checks Markdoc grammar errors: malformed spans, attributes on close tags, and bareword values
// (in attributes or the positional primary). These errors do not depend on the schema.
// Each tag's text is re-parsed with `parseMarkdocSpan` to get the parse reason and value kinds.
// Not reported: `{%- -%}` trim markers, glued attributes (`a=1b=2`), duplicate attributes
// (`markdoc-attributes` handles those), and annotation, variable or function spans.
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
    if (!ctx.markdoc) return;

    for (const token of filterByTypes(ctx.tree, ['markdocTag'])) {
      // Annotation, variable and function spans are out of scope.
      if (
        token.markdocKind === 'annotation' ||
        token.markdocKind === 'variable' ||
        token.markdocKind === 'function'
      ) {
        continue;
      }

      const parsed = parseMarkdocSpan(token.text);

      if (parsed.kind === 'malformed') {
        // `reasonOffset` is relative to the span text, so convert it to a document position.
        // If there is none (empty body, missing delimiter), use the tag's start.
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
        continue;
      }

      // Reported at the first attribute's position, or the tag's start if there is none.
      if (parsed.kind === 'tag-close' && parsed.attributes.length > 0) {
        const firstAttribute = token.children.find((child) => child.type === 'markdocAttribute');
        const position = firstAttribute ?? token;
        ctx.onError({
          line: position.startLine,
          column: position.startColumn,
          context: token.text,
          detail: `close tag "{% /${parsed.name} %}" must not carry attributes — Markdoc's close-tag syntax accepts none`,
        });
        // Stop: the fix is to delete the whole attribute list, so don't also suggest quoting
        // a bareword inside it.
        continue;
      }

      // Primary comes first because it sits right after the tag name.
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

      // structure.ts creates attribute children in the same order as `parsed.attributes`,
      // so the two arrays line up by index.
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
