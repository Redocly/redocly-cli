# Contribute assertions

This document explains how to add a new assertion to `recheck`.
Recheck has two kinds of assertions:

- **Scope rules** — small modules that receive pre-parsed, scope-filtered content and return structured results. These back the native Vale-style prose/style assertions (`swap`, `pattern`, and a few others — see `src/rules/scope/`).
- **Token rules** — markdownlint-style structural rules (see `TokenRule` in [`types.ts`](types.ts)) that receive the shared micromark token tree directly. All 53 markdownlint-parity rules (`src/rules/token/`) are token rules, registered in the `recheck/markdown` preset.

Most of this guide covers scope rules, since that's the more involved case (segment iteration, fix coordination). See [Porting/adding a token rule](#portingadding-a-token-rule) below for the token-rule-specific mechanism, which is simpler and self-contained per rule.

## Goals

- Keep assertions simple and predictable.
- Do not perform file I/O inside assertions.
  Read/write happens once in the runner and CLI.
- Consume pre-parsed context (content, segments, and token tree) for performance and correctness.
- Respect scopes (`paragraph`, `heading`, `sentence`, `code`, and the rest of the vocabulary in `src/scopes/vocabulary.ts`).
- Return structured results (problems and fixes) only.

## Where to add your assertion

1. Create a new file in `packages/recheck/src/rules/scope/` (e.g., `no-double-spaces.ts`).
1. Register it in [`registry.ts`](registry.ts) by adding it to the `scopeRules` map under its assertion id.

That's the only registration step needed. Assertion-id validation (`src/config/validate.ts`) does **not** maintain its own list — `validateAssertions` calls `resolveAssertion` from `registry.ts`, the same lookup `runRules` uses to dispatch assertions at lint time. Any id present in `scopeRules` (or, for token rules, registered via `registerTokenRules`) is automatically "known" the moment it's registered; there's no separate switch/case to keep in sync, and an unregistered id fails validation with `unknown assertion type` for free.

## Required types and interfaces

- Implement and export a `ScopeRule` (from [`types.ts`](types.ts)):
  - `id` — the assertion id used in config under `assertions:` (e.g., `'swap'`).
  - `fixable` — declare fixability here, not in config; set it to `true` only when the rule implements `fix()`.
  - `execute(rule, file, ctx): Promise<Problem[]>`
  - `fix(rule, file, ctx): Promise<Fix[]>` (optional)
- Define an options interface in `src/types/assertions.ts` (e.g., `NoDoubleSpacesAssertion`).
  Read options via `rule.assertions['your-assertion-id']`.
- `ctx` is a `ScopeRuleContext`:
  - `segments` — all `ScopedSegment`s matching the rule's scope, for the whole file.
  - `content` — the full file content.
  - `tree` — the file's micromark token tree (`TokenTree`), for rules that need structure beyond segments.
  - `fileMetadata` — optional per-file metadata (currently the image stats used by `max-image-size`).

## Do not read or write files in assertions

- Never call `fs.readFile` or `fs.writeFile` in `execute`/`fix`.
- The runner parses each file once and passes `content`, `segments`, and `tree`.
  It also applies all returned fixes in a single, ordered pass (see `src/core/auto-fix.ts`).
- Tests should always construct and pass the required context.

## Scope-aware execution

**The runner handles scope filtering automatically.**
You never decide which parts of a file match the rule's scope — you iterate the matching segments the runner hands you.

- Each file is parsed once into a micromark token tree, and all scoped segments are extracted once (see `src/core/runner.ts`).
- **Scoped rules**: the runner compiles the rule's scope selector, filters segments with it, and calls `execute` once per file with every matching segment in `ctx.segments`.
- **Unscoped rules** (`scope: all`, the default): `ctx.segments` is a single whole-file segment with `scope: 'all'`.
- A segment's `content` is the scope's text only.
  For example, a `heading.h2` segment carries the heading text without the `## ` marker, and `segment.metadata` carries extras such as `headingLevel` and `codeLanguage`.
- Report problems in source coordinates using the segment's position:
  - Line: `segment.startLine + localLine - 1`.
  - Column: on a segment's first line, add `segment.startColumn - 1` to your local column, because segment content can start mid-source-line.
    See `toSourceColumn` in [`scope/swap.ts`](scope/swap.ts).
- The runner skips files excluded by `appliesTo`, `excludes`, and `exceptions.files` before calling your rule, and drops problems and fixes on lines matched by `exceptions.lines` after it returns.

**Why this architecture?** Centralized parsing and scoping in the runner means:

- ✅ **Simpler assertions** - focus on your logic, not scope filtering
- ✅ **Consistent behavior** - all assertions get correct scoping automatically
- ✅ **Parse once** - one AST and one segmentation pass per file, shared by every rule
- ✅ **Better maintainability** - scoping logic in one place

## Return problems

- Return `Problem[]` with `file`, `line`, `column`, `text`, `match`, `ruleName`, `severity`, and `message`.
- Use rule message templates responsibly (e.g., `rule.message.replace('%s', match)`).

## Return fixes

- Return `Fix[]` only; do not write files.
- A `Fix` is a single edit in markdownlint `fixInfo` style: `{ file, ruleName, lineNumber, editColumn?, deleteCount?, insertText? }`.
  - `editColumn` (1-based, default 1) is where the edit starts.
  - `deleteCount` characters are deleted from `editColumn`, then `insertText` is inserted.
  - `deleteCount: -1` replaces the whole line with `insertText`, or deletes the line when `insertText` is omitted.
- The runner applies fixes bottom-up and rightmost-first and skips overlapping edits, so emit one `Fix` per independent edit and do not worry about ordering.
- Fixes must converge: the CLI and public API re-lint fixed content until a pass produces no fixes (see `runRulesUntilStable` in `src/core/runner.ts`), so running `fix` on already-fixed content must return nothing.
- Users opt a rule out of fixing with `fix: false` in config.
  The old `autoFixable` config key was removed — a config that sets it now fails validation with an unknown-property error.

## Configuration and validation

- Each assertion has a typed options shape in `src/types/assertions.ts` (e.g., `SwapAssertion`).
- The JSON Schema in `src/config/schema.ts` validates the rule envelope (`severity`, `message`, `scope`, and so on) and accepts any `assertions` object.
- Assertion ids themselves are validated in `src/config/validate.ts` by resolving them through the registry (see [Where to add your assertion](#where-to-add-your-assertion) above) — registering your rule in `registry.ts` is what makes its id pass validation, nothing further to add in `validate.ts` itself.

## Testing

- Add unit tests under `src/rules/scope/__tests__/`.
- For unscoped rules, build the context with `buildWholeFileContext(content)` from [`scope/__tests__/helpers.ts`](scope/__tests__/helpers.ts).
- For scoped rules, build the context the same way the runner does:

  ```ts
  const tree = parseMarkdown(content);
  const segments = extractScopes(tree, content).filter((s) => s.scope.startsWith('heading.'));
  const ctx: ScopeRuleContext = { segments, content, tree };
  ```

- Cover:
  - Positive and negative matches.
  - Edge cases (empty content, special markdown syntax, etc.).
  - First-line column mapping, if your rule reports columns inside segments.
  - **Note**: Scope filtering is tested at the runner level, so your assertion tests can focus on content processing logic.
- Run the suite with `VITEST_SUITE=unit npx vitest run packages/recheck` from the repository root.

## Example skeleton

The skeleton below flags runs of two or more spaces and collapses them to one.
Sharing `findMatches` between `execute` and `fix` (as `swap.ts` does) keeps problems and fixes in agreement, which fix convergence depends on.

```ts
import type { NormalizedRule, Problem, Fix, NoDoubleSpacesAssertion } from '../../types/index.js';
import type { ScopedSegment } from '../../scopes/types.js';
import type { ScopeRule, ScopeRuleContext } from '../types.js';

interface DoubleSpaceMatch {
  line: number; // 1-based within the segment
  column: number; // 1-based within the line
  length: number;
}

function findMatches(content: string): DoubleSpaceMatch[] {
  const matches: DoubleSpaceMatch[] = [];
  const lines = content.split('\n');
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const regex = / {2,}/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(lines[lineIndex])) !== null) {
      matches.push({ line: lineIndex + 1, column: match.index + 1, length: match[0].length });
    }
  }
  return matches;
}

// On a segment's first line, content starts mid-source-line, so the
// segment's startColumn offset applies (see scope/swap.ts).
function toSourceColumn(segment: ScopedSegment, localLine: number, localColumn: number) {
  return localLine === 1 ? segment.startColumn + (localColumn - 1) : localColumn;
}

const execute = async (
  rule: NormalizedRule,
  file: string,
  ctx: ScopeRuleContext
): Promise<Problem[]> => {
  // Read options if your assertion has any.
  const options = rule.assertions['no-double-spaces'] as NoDoubleSpacesAssertion;
  const problems: Problem[] = [];
  for (const segment of ctx.segments) {
    for (const found of findMatches(segment.content)) {
      problems.push({
        file,
        line: segment.startLine + found.line - 1,
        column: toSourceColumn(segment, found.line, found.column),
        text: segment.content.split('\n')[found.line - 1],
        match: ' '.repeat(found.length),
        ruleName: rule.name,
        severity: rule.severity,
        message: rule.message,
      });
    }
  }
  return problems;
};

const fix = async (rule: NormalizedRule, file: string, ctx: ScopeRuleContext): Promise<Fix[]> => {
  const fixes: Fix[] = [];
  for (const segment of ctx.segments) {
    for (const found of findMatches(segment.content)) {
      fixes.push({
        file,
        ruleName: rule.name,
        lineNumber: segment.startLine + found.line - 1,
        editColumn: toSourceColumn(segment, found.line, found.column),
        deleteCount: found.length,
        insertText: ' ',
      });
    }
  }
  return fixes;
};

export const noDoubleSpaces: ScopeRule = { id: 'no-double-spaces', fixable: true, execute, fix };
```

## Porting/adding a token rule

Token rules are markdownlint-style structural rules (headings, lists, links, tables, whitespace — the full `TokenRule` interface is in [`types.ts`](types.ts)). Unlike scope rules, a token rule's `check()` receives the whole file's micromark token tree directly (`ctx.tree`) rather than pre-filtered scope segments, and reports via `ctx.onError(...)` instead of returning `Problem[]`/`Fix[]` arrays.

1. **Rule file shape** — create a file under `src/rules/token/` (e.g., `my-rule.ts`) exporting one `TokenRule` object:
   - `name` — the canonical id used in config under `assertions:` and as the `recheck/<name>` preset key (e.g., `'line-length'`).
   - `aliases` (optional) — permanent, warning-free synonym ids that should also resolve to this rule (e.g. `single-h1`'s `single-title`, `first-line-h1`'s `first-line-heading` — upstream markdownlint's own alternate rule names, not a deprecation mechanism).
   - `tags` — markdownlint-style tag strings (used by computed presets like `recheck/markdown-relaxed` to turn off a whole tag at once).
   - `fixable` — `true` only if `check()` ever populates `onError`'s `fixInfo`.
   - `defaults` — a plain object of this rule's own option names and default values. **Always include `message`** here — this is what a config entry falls back to when it omits its own `message` (see `formatTokenMessage` in `rules/token/messages.ts`), and it's also what preset registration derives the rule's preset message from (see `defaultMessageFor` in `config/presets/markdown.ts`) — no hand-maintained message map needed for token rules.
   - `check(ctx)` — read options off `ctx.config` (already merged: `{...defaults, ...userOptions}`), walk `ctx.tree`/`ctx.lines`, and call `ctx.onError({ line, column?, detail?, context?, fixInfo?, severity? })` per violation.
     - `severity` is optional and exists for the rare rule whose own violation classes genuinely differ in severity from each other. `markdoc-attributes` is the one example: its missing-required, enum, wrong-type, and duplicate reports use whatever severity the config gives the rule, but its unknown-attribute reports are always `warn`. Leave `severity` unset for every other rule, so the config's rule-level severity applies uniformly.
     - When set, it wins over the config's severity for that one report (`core/runner.ts` resolves `info.severity ?? rule.severity`). It can only lower a report's effective severity, never raise it, and `severity: 'off'` in the config still disables the rule entirely.
1. **Register it** — add the rule to the barrel in [`src/rules/token/index.ts`](token/index.ts): import it, add it to `allTokenRules` (in one of the batch arrays, or a new one), and export it from the barrel's named exports. `registry.ts` registers every rule in `allTokenRules` once at module load via `registerTokenRules` — there is no separate switch/list to update, the same as scope rules (see [Where to add your assertion](#where-to-add-your-assertion) above).
1. **Add it to the `recheck/markdown` preset** — append the rule's `name` to `MARKDOWN_PRESET_RULES` in [`src/config/presets/markdown.ts`](../config/presets/markdown.ts). This is what actually exposes the rule under `extends: [recheck/markdown]`; a registered-but-unlisted rule is only reachable by naming its assertion id directly in a user config. `presets.test.ts` has a drift-guard test asserting `MARKDOWN_PRESET_RULES` and the registry's `allTokenRules` stay in exact 1:1 correspondence, so a forgotten rule fails CI immediately.
1. **Test with the harness** — use `tokenRuleHarness` from [`token/__tests__/harness.ts`](token/__tests__/harness.ts) in a new `src/rules/token/__tests__/my-rule.test.ts`:

   ```ts
   import { beforeAll, describe, expect, it } from 'vitest';
   import { clearTokenRulesForTests, registerTokenRules } from '../../registry.js';
   import { myRule } from '../my-rule.js';
   import { tokenRuleHarness } from './harness.js';

   describe('my-rule (MDxxx)', () => {
     beforeAll(() => {
       clearTokenRulesForTests();
       registerTokenRules([myRule]);
     });
     const h = tokenRuleHarness('my-rule');

     it('passes clean input', async () => {
       expect(await h.lint('...')).toEqual([]);
     });
   });
   ```

   Use `tokenRuleUnitHarness` instead (invokes `TokenRule.check()` directly, bypassing `resolveAssertion`) only if your rule's id collides with a still-registered legacy scope rule id — see its doc comment in `harness.ts` for why that matters and when it no longer does.

1. **Attribution header** — if porting an existing markdownlint rule (the common case), open the file with a comment naming the upstream source, matching the convention every existing token rule uses:

   ```ts
   // Ported from markdownlint's lib/mdXXX.mjs
   // (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
   ```

   Note any additive Recheck-only options or intentional behavior differences from upstream in a doc comment near the option in question.
   See `no-duplicate-heading.ts` and its `respectSections`, `caseSensitive`, and `ignoreCommonHeadings` options for an example.
   The `README.md` section on migrating from markdownlint and the parity harness (archived in the Redocly monorepo) rely on those notes staying accurate.

## Checklist before opening a PR

- [ ] Assertion uses context only (no direct file I/O).
- [ ] Problems and fixes are reported in source coordinates (`segment.startLine`/`startColumn` mapping).
- [ ] Registered in `src/rules/registry.ts` (scope rules: added to the `scopeRules` map; token rules: added to the `allTokenRules` barrel in `src/rules/token/index.ts`, which `registry.ts` registers automatically).
- [ ] Token rules only: added to `MARKDOWN_PRESET_RULES` in `src/config/presets/markdown.ts` so `extends: [recheck/markdown]` picks it up.
- [ ] Scope rules only: options interface added to `src/types/assertions.ts` (if the assertion has options). Token rules don't need one — their options are typed by the permissive `TokenRuleOptions` escape hatch already in `AssertionConfig`, and their real shape lives in the rule's own `defaults` object.
- [ ] Tests added and passing.
- [ ] If fixable: `fixable: true` is set, `execute` and `fix` agree, and fixing converges (re-running on fixed content finds nothing).
