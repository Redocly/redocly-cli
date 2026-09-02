import { filterByTypes } from '../../parser/index.js';
import type { MarkdocAttributeSchema } from '../../parser/markdoc/schema.js';
// Schema-aware attribute validation for tags `markdoc-unknown-tag` already
// accepts as known (that rule owns the tag NAME itself). Detection-only.
// Re-parses each tag's text via `parseMarkdocSpan` because the child tokens
// structure.ts synthesizes carry positions but no `valueKind`/`value`/
// `dynamic` data.
//
// Only `tag-open`/`tag-self-closing` kinds are checked: close tags carry no
// attributes in Markdoc's grammar, and annotation/variable/function/malformed
// spans have no tag name to look up a schema with. Annotations are a known v1
// gap -- real Markdoc does check their attributes against the node they attach
// to, but no per-annotation schema is modeled here. Unknown tags are skipped
// too: upstream reports `tag-undefined` and no attribute errors for them, so
// adding attribute reports on top of `markdoc-unknown-tag`'s would be noise.
import {
  parseMarkdocSpan,
  type MarkdocAttribute,
  type MarkdocValueKind,
} from '../../parser/markdoc/span.js';
import type { Token } from '../../parser/types.js';
import type { TokenRule } from '../types.js';

/**
 * Real Markdoc merges `{ ...globalAttributes, ...schema.attributes }` before
 * validating, so `class`/`id` are never unknown -- but a tag that declares one
 * itself wins that merge and has it value-checked like any other attribute
 * (four realm tags declare their own `id`: `input`, `step`, `tabs`, `toggle`).
 * The carve-out below therefore fires only when the tag's own schema has no
 * entry for the name, which is also why `.x`/`#x` shortcuts are always
 * schema-valid. The global case can't be value-checked at all: Markdoc's
 * `Class`/`Id` validators are custom classes, out of reach for a
 * statics-only schema -- see `MarkdocAttributeSchema`'s `dynamic` comment.
 */
const GLOBAL_ATTRIBUTE_NAMES: ReadonlySet<string> = new Set(['class', 'id']);

interface AttributeReport {
  line: number;
  column: number;
  context: string;
  /**
   * "Unknown attribute" is fixed at `warn`, while every other violation this
   * rule reports (missing required, enum, wrong type, duplicate) takes the
   * rule's configured severity (`error` in the `recheck/markdoc` preset). A
   * rule's config severity is necessarily ONE value, so the two "is not a
   * known attribute of" push sites set this field explicitly and every other
   * push site leaves it unset (`info.severity ?? rule.severity`).
   */
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

/**
 * Type + enum ("matches") checks for one already-known, non-dynamic,
 * non-opaque attribute value -- shared by named attributes and the positional
 * primary, which real Markdoc validates identically. Upstream treats the two
 * checks as independent (a wrong-type value that also fails `matches` reports
 * both), so this pushes up to two reports rather than short-circuiting.
 */
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

/** Value kinds this rule cannot statically check: `variable`/`function` are
 * opaque at parse time, and `bareword` is already `markdoc-syntax`'s report --
 * a type/enum verdict on a value that isn't legal Markdoc would contradict
 * that rule's "quote the value" advice. */
function isOpaqueOrSyntaxOwned(kind: MarkdocValueKind): boolean {
  return kind === 'variable' || kind === 'function' || kind === 'bareword';
}

export const markdocAttributes: TokenRule = {
  name: 'markdoc-attributes',
  tags: ['markdoc'],
  fixable: false,
  // Bare placeholder: every `onError` call supplies the complete sentence
  // via `context`.
  defaults: {
    message: '%s',
  },
  // oxlint-disable-next-line sonarjs/cognitive-complexity -- ported from the source engine, written and reviewed against that repo's threshold of 100 (this repo's default is 30); needs a dedicated refactor or a per-package override, not a same-task rewrite of correctness-critical rule logic.
  check(ctx) {
    if (!ctx.markdoc) return; // flag off -- no markdocTag tokens exist at all
    const { schema } = ctx.markdoc;
    if (!schema) return; // `schema: false` -- nothing to validate attributes against

    // One tag can produce reports from four independent checks (primary,
    // per-attribute, missing-required, duplicate) run in whatever order is
    // convenient to compute, so reports are collected and sorted at the end
    // to leave this rule in document order rather than check order.
    const reports: AttributeReport[] = [];

    for (const token of filterByTypes(ctx.tree, ['markdocTag'])) {
      if (token.markdocKind !== 'tag-open' && token.markdocKind !== 'tag-self-closing') continue;

      const nameChild = token.children.find((child) => child.type === 'markdocTagName');
      const tagName = nameChild?.text;
      if (!tagName) continue; // defensive only: both kinds always carry a name child

      const tagSchema = schema.tags[tagName];
      if (!tagSchema) continue; // unknown tag -- markdoc-unknown-tag's report, not this rule's

      const attributes = tagSchema.attributes ?? {};
      const parsed = parseMarkdocSpan(token.text);
      // Defensive only: `token.markdocKind` came from this same parse.
      if (parsed.kind !== 'tag-open' && parsed.kind !== 'tag-self-closing') continue;

      // ---- primary: Markdoc's positional value slot, validated against the
      // schema attribute literally named `primary`. Checked before the
      // named-attribute loop only because its span offset is always earlier;
      // the final sort makes that ordering non-load-bearing.
      let primaryPresent = false;
      // Hoisted out of the branch below: the duplicate-attribute walk needs
      // this position too.
      const primaryToken = token.children.find((child) => child.type === 'markdocTagPrimary');
      if (parsed.primary) {
        primaryPresent = true;
        const { valueKind, value } = parsed.primary;
        if (!isOpaqueOrSyntaxOwned(valueKind)) {
          const position = primaryToken ?? token;
          const primarySchema = attributes.primary;
          if (!primarySchema) {
            // Upstream treats a primary value on a tag that declares no
            // `primary` attribute like any other undeclared name, so this is
            // the "unknown attribute" class -- `warn`, per AttributeReport.
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

      // ---- named attributes. Real Markdoc validates the MERGED
      // last-write-wins attributes object, not the raw source list, so
      // `{% t a=1 a=2 %}` with `a` undeclared reports `attribute-undefined`
      // once, not twice. `lastByName` reproduces that collapse: the
      // unknown/type/enum checks below fire once per NAME, on the last
      // occurrence's value and position. The separate duplicate pass further
      // down still walks every raw occurrence, since it needs the repetition
      // this map erases.
      const attributeTokens = token.children.filter((child) => child.type === 'markdocAttribute');
      // `index` is carried alongside the pair so the value-position lookup in
      // the loop is an O(1) array read rather than an `indexOf` scan per
      // entry -- otherwise O(n²) for a long attribute list.
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
          // `class`/`id` are never "unknown" when the tag itself declares no
          // entry for the name; a tag that does declare its own takes the
          // ordinary declared-attribute path (see `GLOBAL_ATTRIBUTE_NAMES`).
          if (GLOBAL_ATTRIBUTE_NAMES.has(attrName)) continue;
          // `warn` -- the "unknown attribute" class, per AttributeReport.
          reports.push({
            line: nameTokenPos.startLine,
            column: nameTokenPos.startColumn,
            context: `"${attrName}" is not a known attribute of "${tagName}" — check for a typo`,
            severity: 'warn',
          });
          continue;
        }
        if (attrSchema.dynamic) continue; // value checks skip dynamic attributes (see schema.ts)
        if (isOpaqueOrSyntaxOwned(attribute.valueKind)) continue;

        // Value checks report at the value's own position, not the name's --
        // the same split `markdoc-syntax` uses for its bareword check.
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

      // ---- missing required. Unlike the type/enum checks above, this runs
      // even for `dynamic` attributes: upstream enforces `required` purely on
      // absence, independent of `type`/`matches`/a tag-level `validate()`.
      // The realm schema has attributes that are both `required` and
      // `dynamic` (`diagram.file`, `diagram.type`, `code-snippet.file`), so
      // skipping those would silently diverge from upstream. (`partial.file`
      // carries no `required` in the composed schema at all.)
      //
      // Presence folds three sources: named attributes, the positional
      // primary (any value kind -- even a `bareword`, whose shape is
      // `markdoc-syntax`'s report; it still occupies the slot, so `required`
      // is satisfied and nothing double-reports), and class/id shortcuts.
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

      // ---- duplicate-attribute. One pass over the positional primary, every
      // named attribute and every shortcut IN SOURCE ORDER, replicating real
      // Markdoc's own parser, the only place it raises this error:
      //
      // - The positional primary, a named attribute and an `id` shortcut all
      //   go through one branch upstream, which checks whether the name is
      //   already set, reports if so, then marks it set either way. The
      //   primary always sits at the lowest offset, so it can only ever be
      //   the item something else collides WITH, never the collider.
      // - A `class` shortcut takes a separate branch that never checks -- it
      //   only merges into the `class` map -- so class shortcuts never
      //   collide with each other.
      // - Hence an order-dependent asymmetry: `{% t .a class="b" %}` reports
      //   a duplicate, while `{% t class="b" .a %}` reports nothing. Walking
      //   in true source order reproduces both verdicts; direction-agnostic
      //   set membership would not.
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
