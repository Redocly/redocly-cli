import { filterByTypes } from '../../parser/index.js';
import type { MarkdocAttributeSchema } from '../../parser/markdoc/schema.js';
// Checks the attributes of known tags against the schema (`markdoc-unknown-tag` checks the
// tag name). Only open and self-closing tags are checked: close tags have no attributes, and
// other spans have no tag name to look up. Annotations are not checked.
import {
  parseMarkdocSpan,
  type MarkdocAttribute,
  type MarkdocValueKind,
} from '../../parser/markdoc/span.js';
import type { Token } from '../../parser/types.js';
import type { TokenRule } from '../types.js';

/**
 * `class` and `id` are allowed on every tag. A tag that declares its own `class` or `id`
 * is checked like any other attribute.
 */
const GLOBAL_ATTRIBUTE_NAMES: ReadonlySet<string> = new Set(['class', 'id']);

interface AttributeReport {
  line: number;
  column: number;
  context: string;
  /** "Unknown attribute" is always `warn`; other reports use the rule's configured severity. */
  severity?: 'warn';
}

/** One item in the duplicate-attribute source-order walk in `check()`. */
interface DuplicateItem {
  offset: number;
  checked: boolean; // false only for a class shortcut
  name: string;
  position: Token;
}

function describeValueKind(kind: MarkdocValueKind): string {
  if (kind === 'null') return 'null';
  const article = 'aeiou'.includes(kind[0]) ? 'an' : 'a';
  return `${article} ${kind}`;
}

function formatEnum(values: readonly string[]): string {
  return values.map((value) => `"${value}"`).join(', ');
}

/** Checks the type and the enum of one attribute value. Both are reported if both fail. */
function checkValue(
  attrName: string,
  valueKind: MarkdocValueKind,
  value: string | number | boolean | null,
  attrSchema: MarkdocAttributeSchema,
  position: Token,
  reports: AttributeReport[]
): void {
  if (valueKind !== attrSchema.type) {
    reports.push({
      line: position.startLine,
      column: position.startColumn,
      context: `"${attrName}" must be a ${attrSchema.type} value — got ${describeValueKind(valueKind)}`,
    });
  }
  if (attrSchema.enum && !attrSchema.enum.includes(String(value))) {
    reports.push({
      line: position.startLine,
      column: position.startColumn,
      context: `"${attrName}" must be one of ${formatEnum(attrSchema.enum)} — got "${String(value)}"`,
    });
  }
}

/** Value kinds that cannot be checked: variables and functions, and barewords (reported by `markdoc-syntax`). */
function isOpaqueOrSyntaxOwned(kind: MarkdocValueKind): boolean {
  return kind === 'variable' || kind === 'function' || kind === 'bareword';
}

export const markdocAttributes: TokenRule = {
  name: 'markdoc-attributes',
  tags: ['markdoc'],
  fixable: false,
  defaults: {
    message: '%s',
  },
  check(ctx) {
    if (!ctx.markdoc) return; // markdoc parsing is off
    const { schema } = ctx.markdoc;
    if (!schema) return; // `schema: false`

    // Checks run in different orders, so sort the reports into document order at the end.
    const reports: AttributeReport[] = [];

    for (const token of filterByTypes(ctx.tree, ['markdocTag'])) {
      if (token.markdocKind !== 'tag-open' && token.markdocKind !== 'tag-self-closing') continue;

      const nameChild = token.children.find((child) => child.type === 'markdocTagName');
      const tagName = nameChild?.text;
      if (!tagName) continue;

      const tagSchema = schema.tags[tagName];
      if (!tagSchema) continue; // unknown tag, reported by markdoc-unknown-tag

      const attributes = tagSchema.attributes ?? {};
      const parsed = parseMarkdocSpan(token.text);
      if (parsed.kind !== 'tag-open' && parsed.kind !== 'tag-self-closing') continue;

      // Primary: the positional value, checked against the schema attribute named `primary`.
      let primaryPresent = false;
      // Also used by the duplicate-attribute check below.
      const primaryToken = token.children.find((child) => child.type === 'markdocTagPrimary');
      if (parsed.primary) {
        primaryPresent = true;
        const { valueKind, value } = parsed.primary;
        if (!isOpaqueOrSyntaxOwned(valueKind)) {
          const position = primaryToken ?? token;
          const primarySchema = attributes.primary;
          if (!primarySchema) {
            // A primary value on a tag with no `primary` attribute is an unknown attribute (`warn`).
            reports.push({
              line: position.startLine,
              column: position.startColumn,
              context: `"primary" is not a known attribute of "${tagName}" — check for a typo`,
              severity: 'warn',
            });
          } else if (!primarySchema.dynamic) {
            checkValue('primary', valueKind, value, primarySchema, position, reports);
          }
        }
      }

      // Named attributes. Markdoc keeps only the last value of a repeated name, so
      // `{% t a=1 a=2 %}` with `a` undeclared reports one unknown attribute.
      // The duplicate check below still walks every occurrence.
      const attributeTokens = token.children.filter((child) => child.type === 'markdocAttribute');
      // `index` lets the loop find the value position without scanning.
      const lastByName = new Map<
        string,
        { attribute: MarkdocAttribute; index: number; position: Token }
      >();
      parsed.attributes.forEach((attribute, index) => {
        const attributeToken = attributeTokens[index];
        const nameToken =
          attributeToken?.children.find((child) => child.type === 'markdocAttributeName') ??
          attributeToken ??
          token;
        lastByName.set(attribute.name, { attribute, index, position: nameToken });
      });

      for (const [attrName, entry] of lastByName) {
        const { attribute, index: attributeIndex, position: nameTokenPos } = entry;
        const attrSchema = attributes[attrName];
        if (!attrSchema) {
          // `class` and `id` are never unknown.
          if (GLOBAL_ATTRIBUTE_NAMES.has(attrName)) continue;
          reports.push({
            line: nameTokenPos.startLine,
            column: nameTokenPos.startColumn,
            context: `"${attrName}" is not a known attribute of "${tagName}" — check for a typo`,
            severity: 'warn',
          });
          continue;
        }
        if (attrSchema.dynamic) continue; // dynamic values cannot be checked
        if (isOpaqueOrSyntaxOwned(attribute.valueKind)) continue;

        // Value checks report at the value's position, not the name's.
        const attributeToken = attributeTokens[attributeIndex];
        const valueTokenPos =
          attributeToken?.children.find((child) => child.type === 'markdocAttributeValue') ??
          attributeToken ??
          token;
        checkValue(
          attrName,
          attribute.valueKind,
          attribute.value,
          attrSchema,
          valueTokenPos,
          reports
        );
      }

      // Missing required. This also runs for `dynamic` attributes, because Markdoc checks
      // `required` only by absence. A positional primary (even a bareword) or a class/id
      // shortcut counts as present.
      const presentNames = new Set<string>(lastByName.keys());
      if (primaryPresent) presentNames.add('primary');
      for (const shortcut of parsed.shortcuts ?? []) presentNames.add(shortcut.kind);

      for (const [attrName, attrSchema] of Object.entries(attributes)) {
        if (!attrSchema.required || presentNames.has(attrName)) continue;
        reports.push({
          line: token.startLine,
          column: token.startColumn,
          context: `"${tagName}" is missing its required "${attrName}" attribute`,
        });
      }

      // Duplicate attributes. Walk the primary, named attributes and shortcuts in source order,
      // like Markdoc's parser. `class` shortcuts never collide with each other, so
      // `{% t .a class="b" %}` reports a duplicate but `{% t class="b" .a %}` does not.
      const shortcutTokens = token.children.filter((child) => child.type === 'markdocShortcut');
      const duplicateItems: DuplicateItem[] = [
        ...(parsed.primary
          ? [
              {
                offset: parsed.primary.valueStart,
                checked: true,
                name: 'primary',
                position: primaryToken ?? token,
              },
            ]
          : []),
        ...parsed.attributes.map((attribute, index) => ({
          offset: attribute.nameStart,
          checked: true,
          name: attribute.name,
          position:
            attributeTokens[index]?.children.find(
              (child) => child.type === 'markdocAttributeName'
            ) ??
            attributeTokens[index] ??
            token,
        })),
        ...(parsed.shortcuts ?? []).map((shortcut, index) => ({
          offset: shortcut.start,
          checked: shortcut.kind === 'id',
          name: shortcut.kind, // the schema attribute it folds into, not its own text
          position: shortcutTokens[index] ?? token,
        })),
      ];
      duplicateItems.sort((a, b) => a.offset - b.offset);

      const setNames = new Set<string>();
      for (const item of duplicateItems) {
        if (item.checked && setNames.has(item.name)) {
          reports.push({
            line: item.position.startLine,
            column: item.position.startColumn,
            context: `"${item.name}" is already set earlier on this tag`,
          });
        }
        setNames.add(item.name);
      }
    }

    reports.sort((a, b) => a.line - b.line || a.column - b.column);
    for (const report of reports) ctx.onError(report);
  },
};
