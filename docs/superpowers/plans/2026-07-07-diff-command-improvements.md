# Diff Command Crucial Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the silent `--fail-on` failure, keep every rule verdict per change, add real file/line/col locations, simplify the severity model to `breaking`/`non-breaking`, group stylish output per operation, align `--format` typing with core's `OutputFormat`, drop dead code, and match renamed path parameters.

**Architecture:** All work stays in `packages/cli/src/commands/diff` except a one-line union extension in `packages/core/src/format/format.ts`. The engine pipeline becomes: collect → **align** (compare-stage aliasing of unambiguously renamed path templates into the base pointer space, emitting an explicit rename change) → compare → classify (now keeping ALL verdicts per change) → **locate** (attach `file`/`line`/`col` to each change side via `Source` + `getLineColLocation`). Collect is NOT modified for path matching — stable pointers stay truthful to each document, and renames are visible as explicit changes.

**Tech Stack:** TypeScript (ESM, `.js` import suffixes required), vitest, `@redocly/openapi-core` public API only.

## Global Constraints

- The diff engine must consume ONLY the public `@redocly/openapi-core` API; the sole change to `packages/core` in this plan is adding `'html'` to the `OutputFormat` union (Task 4).
- The JSON output stays `version: '1'` — the command is experimental and unreleased, so shape changes need no compatibility shim.
- All imports use explicit `.js` suffixes (ESM).
- Run unit tests with: `VITEST_SUITE=unit npx vitest run <path>` from the repo root.
- Typecheck with: `npm run typecheck` from the repo root.
- Commit after every task with a conventional-commit message ending in:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- Severity model decision (pre-approved by the user): `Compat = 'breaking' | 'non-breaking'`. The former `warning` level (used only by `ref-target-changed`) is folded into `breaking` — a `$ref` retarget cannot be statically verified as compatible, so the conservative verdict is breaking.
- Path-rename matching happens at the COMPARE stage (decision by the user): collect-time key rewriting is forbidden — it risks collisions and hides the fact that a rename happened.

## File Structure

| File                                                                | Action  | Responsibility                                                                                                                                                                                           |
| ------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/cli/src/commands/diff/engine/types.ts`                    | Modify  | `Compat` shrinks to 2 values; `DiffSummary` loses `warning`; `Change` gets `verdicts: ChangeVerdict[]` (drops `ruleIds`/`message`); `ChangeSide` gains `file`/`line`/`col`; drop `worstOf` + `warning()` |
| `packages/cli/src/commands/diff/engine/output-schema.ts`            | Delete  | Unused outside tests                                                                                                                                                                                     |
| `packages/cli/src/commands/diff/engine/classify/index.ts`           | Modify  | Keep every verdict, worst-first; `compat` = worst                                                                                                                                                        |
| `packages/cli/src/commands/diff/engine/classify/rules/ref-rules.ts` | Modify  | `ref-target-changed` becomes `breaking`                                                                                                                                                                  |
| `packages/cli/src/commands/diff/engine/align-paths.ts`              | Create  | Compare-stage aliasing of renamed path templates                                                                                                                                                         |
| `packages/cli/src/commands/diff/engine/locate.ts`                   | Create  | Attach `file`/`line`/`col` to change sides                                                                                                                                                               |
| `packages/cli/src/commands/diff/engine/index.ts`                    | Modify  | 2-bucket summary; call `alignRenamedPaths` + `locateChanges`; emit rename changes                                                                                                                        |
| `packages/cli/src/commands/diff/fail-on.ts`                         | Create  | `DiffFailOn` type + pure `getDiffFailure()` gate                                                                                                                                                         |
| `packages/cli/src/commands/diff/index.ts`                           | Modify  | Print failure via logger, `--output` note, `printExecutionTime`, `DiffOutputFormat = Extract<OutputFormat, …>`                                                                                           |
| `packages/cli/src/commands/diff/serializers/stylish.ts`             | Rewrite | Group changes per `METHOD /path`, render ALL verdicts, clickable `file:line:col`                                                                                                                         |
| `packages/cli/src/commands/diff/serializers/{markdown,html}.ts`     | Modify  | Drop `warning` labels; render all verdicts                                                                                                                                                               |
| `packages/core/src/format/format.ts`                                | Modify  | Add `'html'` to `OutputFormat` union                                                                                                                                                                     |
| `packages/cli/src/index.ts`                                         | Modify  | yargs: `--fail-on` choices `breaking`/`none`; format choices typed via `DiffOutputFormat`                                                                                                                |
| `docs/@v2/commands/diff.md`                                         | Modify  | Reflect all of the above                                                                                                                                                                                 |
| Existing tests under `commands/diff/**/__tests__/`                  | Modify  | Follow each task                                                                                                                                                                                         |

---

### Task 1: Two-level `Compat` + dead-code removal

**Files:**

- Modify: `packages/cli/src/commands/diff/engine/types.ts`
- Modify: `packages/cli/src/commands/diff/engine/classify/rules/ref-rules.ts`
- Modify: `packages/cli/src/commands/diff/engine/index.ts` (summary reduce)
- Delete: `packages/cli/src/commands/diff/engine/output-schema.ts`
- Modify: `packages/cli/src/commands/diff/index.ts` (`DiffFailOn`, gate expression)
- Modify: `packages/cli/src/index.ts` (`--fail-on` choices)
- Modify: `packages/cli/src/commands/diff/serializers/stylish.ts`, `markdown.ts`, `html.ts` (drop `warning` entries)
- Test: `engine/__tests__/types.test.ts`, `engine/__tests__/rules-schema.test.ts`, `engine/__tests__/diff-documents.test.ts`, `__tests__/serializers.test.ts`, `__tests__/serializers-rich.test.ts`

**Interfaces:**

- Produces: `type Compat = 'breaking' | 'non-breaking'`; `interface DiffSummary { breaking: number; nonBreaking: number }`; `type DiffFailOn = 'breaking' | 'none'` (still in `diff/index.ts` for now; Task 3 moves it to `fail-on.ts`).
- `worstOf`, `warning()`, `DIFF_OUTPUT_SCHEMA` no longer exist.

- [ ] **Step 1: Update the type-helper test to the two-level model**

Replace the whole of `packages/cli/src/commands/diff/engine/__tests__/types.test.ts` with:

```ts
import { compatRank, breaking } from '../types.js';

describe('diff types helpers', () => {
  it('ranks compat levels', () => {
    expect(compatRank('breaking')).toBeGreaterThan(compatRank('non-breaking'));
  });

  it('builds breaking verdicts', () => {
    expect(breaking('boom')).toEqual({ compat: 'breaking', message: 'boom' });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff/engine/__tests__/types.test.ts`
Expected: red (typecheck or test failure) before Step 3.

- [ ] **Step 3: Shrink `Compat` in `engine/types.ts`**

```ts
export type Compat = 'breaking' | 'non-breaking';
```

```ts
export interface DiffSummary {
  breaking: number;
  nonBreaking: number;
}
```

```ts
const COMPAT_RANK: Record<Compat, number> = { breaking: 1, 'non-breaking': 0 };
```

Delete the `worstOf` and `warning` functions entirely. Keep `compatRank` and `breaking`.

- [ ] **Step 4: Make `ref-target-changed` breaking**

Replace `packages/cli/src/commands/diff/engine/classify/rules/ref-rules.ts` with:

```ts
import { breaking, type DiffRule } from '../../types.js';

// Pointer-aligned comparison cannot verify whether two different targets are
// content-equivalent (spec §7.3, §13) — the conservative verdict is breaking.
export const refTargetChanged: DiffRule = {
  id: 'ref-target-changed',
  description:
    'A $ref now points to a different target; content equivalence cannot be verified automatically.',
  visit(change, ctx) {
    if (change.kind !== 'changed' || !change.property) return;
    const wasRef = change.property in (ctx.base(change.pointer)?.refs ?? {});
    const isRefNow = change.property in (ctx.revision(change.pointer)?.refs ?? {});
    if (!wasRef && !isRefNow) return;
    return breaking(
      `Reference target changed from '${change.base?.value}' to '${change.revision?.value}' — content equivalence cannot be verified.`
    );
  },
};
```

- [ ] **Step 5: Two-bucket summary in `engine/index.ts`**

Replace the summary reduce with:

```ts
const summary = changes.reduce<DiffSummary>(
  (acc, change) => {
    if (change.compat === 'breaking') acc.breaking++;
    else acc.nonBreaking++;
    return acc;
  },
  { breaking: 0, nonBreaking: 0 }
);
```

- [ ] **Step 6: Delete the unused output schema**

```bash
git rm packages/cli/src/commands/diff/engine/output-schema.ts
```

In `engine/__tests__/diff-documents.test.ts`: delete the entire `it('validates against the published output schema', …)` block and the two imports it used (`Ajv` and `DIFF_OUTPUT_SCHEMA`). Update the summary assertion in the first test to:

```ts
expect(result.summary).toEqual({ breaking: 1, nonBreaking: 2 });
```

- [ ] **Step 7: Update the CLI gate and yargs choices**

In `packages/cli/src/commands/diff/index.ts`:

```ts
export type DiffFailOn = 'breaking' | 'none';
```

and replace the failure block at the end of `handleDiff` with:

```ts
const failed = argv['fail-on'] === 'breaking' && result.summary.breaking > 0;
if (failed) {
  throw new AbortFlowError('Diff failed.');
}
```

In `packages/cli/src/index.ts`, `diff` command options, change `fail-on` to:

```ts
          'fail-on': {
            description: 'Exit with a non-zero code when changes of this level are found.',
            choices: ['breaking', 'none'] as ReadonlyArray<'breaking' | 'none'>,
            default: 'breaking' as const,
          },
```

- [ ] **Step 8: Drop `warning` from all three serializers**

`serializers/stylish.ts` (Task 6 rewrites this file — here only make it compile):

```ts
const SEVERITY_ORDER: Compat[] = ['breaking', 'non-breaking'];

const ICONS: Record<Compat, string> = {
  breaking: red('✖ breaking    '),
  'non-breaking': green('✔ non-breaking'),
};
```

and the summary line:

```ts
const { breaking, nonBreaking } = result.summary;
lines.push('', `${red(`${breaking} breaking`)}, ${green(`${nonBreaking} non-breaking`)}.`);
```

Remove the now-unused `yellow` import.

`serializers/markdown.ts`:

```ts
const IMPACT_LABEL: Record<Change['compat'], string> = {
  breaking: '🔴 breaking',
  'non-breaking': '🟢 non-breaking',
};
```

and the summary line:

```ts
    `**${breaking}** breaking · **${nonBreaking}** non-breaking`,
```

(destructure only `breaking` and `nonBreaking` from `result.summary`).

`serializers/html.ts`:

```ts
const IMPACT_CLASS: Record<Change['compat'], string> = {
  breaking: 'breaking',
  'non-breaking': 'ok',
};
```

Remove the `.warning .badge` CSS rule and the warning `<span>` from the summary paragraph; destructure only `breaking` and `nonBreaking`.

- [ ] **Step 9: Update remaining test expectations**

- `engine/__tests__/rules-schema.test.ts:111`: change `.toBe('warning')` → `.toBe('breaking')`.
- `__tests__/serializers.test.ts`: in the fixture, change the change object with `compat: 'warning'` to `compat: 'breaking'`; set `summary: { breaking: 2, nonBreaking: 1 }`; replace the three ordering assertions with `expect(breakingIndex).toBeLessThan(nonBreakingIndex);` keeping `breakingIndex`/`nonBreakingIndex` lookups; change `expect(output).toContain('1 warning')` to `expect(output).toContain('2 breaking')`.
- `__tests__/serializers-rich.test.ts`: change the fixture summary to `{ breaking: 1, nonBreaking: 0 }`. If any assertion mentions `warning`, delete it.

- [ ] **Step 10: Verify green**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff && npm run typecheck`
Expected: PASS, no type errors.

- [ ] **Step 11: Commit**

```bash
git add -A packages/cli
git commit -m "refactor(cli): simplify diff compat model to breaking/non-breaking

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Keep every rule verdict per change

Today `classifyChanges` keeps a flat `ruleIds` list but only the WORST verdict's message survives. Replace both fields with a `verdicts` array holding every verdict (worst-first); `compat` stays the worst verdict's level.

**Files:**

- Modify: `packages/cli/src/commands/diff/engine/types.ts`
- Modify: `packages/cli/src/commands/diff/engine/classify/index.ts`
- Modify: `packages/cli/src/commands/diff/serializers/stylish.ts`, `markdown.ts`, `html.ts`
- Test: `engine/__tests__/classify.test.ts`, `engine/__tests__/diff-documents.test.ts`, `__tests__/serializers.test.ts`, `__tests__/serializers-rich.test.ts`

**Interfaces:**

- Consumes: `Compat`/`compatRank` from Task 1.
- Produces:

```ts
export interface Verdict {
  compat: Compat;
  message: string;
}

export interface ChangeVerdict extends Verdict {
  ruleId: string;
}
```

`Change` drops `ruleIds`/`message` and gains `verdicts?: ChangeVerdict[]` (present only when at least one rule fired; sorted worst-first, ties by `ruleId`). `RawChange = Omit<Change, 'compat' | 'verdicts'>`.

- [ ] **Step 1: Write the failing test**

In `engine/__tests__/classify.test.ts`:

- In the first test, replace the `ruleIds`/`message` assertions with:

```ts
expect(change.verdicts).toEqual([
  { ruleId: 'operation-removed', compat: 'breaking', message: 'Operation was removed.' },
]);
```

- In the second test, replace the `ruleIds` assertion with:

```ts
expect(change.verdicts).toEqual([
  { ruleId: 'path-removed', compat: 'breaking', message: 'Path was removed.' },
]);
```

- In the third test, replace `expect(change.ruleIds).toBeUndefined();` with `expect(change.verdicts).toBeUndefined();`.
- Add a new test proving MULTIPLE verdicts survive (a component schema used in both a request and a response, whose enum both loses and gains values, fires both enum rules):

```ts
it('keeps every verdict when multiple rules fire, worst-first', () => {
  const usage = new UsageIndex([
    {
      site: '#/paths/~1x/get/parameters/{query:q}/schema',
      target: '#/components/schemas/S',
    },
    {
      site: '#/paths/~1x/get/responses/200/content/application~1json/schema',
      target: '#/components/schemas/S',
    },
  ]);
  const changes: RawChange[] = [
    {
      pointer: '#/components/schemas/S',
      property: 'enum',
      kind: 'changed',
      typeName: 'Schema',
      base: { pointer: '#/components/schemas/S/enum', value: ['a', 'b'] },
      revision: { pointer: '#/components/schemas/S/enum', value: ['a', 'c'] },
    },
  ];
  const [change] = classifyChanges({
    changes,
    specVersion: 'oas3_1',
    base: new Map(),
    revision: new Map(),
    usage,
  });
  expect(change.compat).toBe('breaking');
  expect(change.verdicts?.map((v) => v.ruleId)).toEqual([
    'enum-values-added',
    'enum-values-removed',
  ]);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff/engine/__tests__/classify.test.ts`
Expected: FAIL — `verdicts` is undefined on the result.

- [ ] **Step 3: Update `types.ts` and `classify/index.ts`**

In `engine/types.ts`: add `ChangeVerdict` (shown in Interfaces), and update `Change`:

```ts
export interface Change {
  pointer: string; // stable node pointer — the change's identity
  property?: string; // set for property-level changes
  kind: ChangeKind;
  typeName: string;
  base?: ChangeSide; // absent for added
  revision?: ChangeSide; // absent for removed
  compat: Compat; // worst verdict's level; 'non-breaking' when no rule fired
  verdicts?: ChangeVerdict[]; // every rule verdict, worst-first
}

// What compare() emits — classification fields are filled later by classify().
export type RawChange = Omit<Change, 'compat' | 'verdicts'>;
```

In `classify/index.ts`, replace the per-change body of the `changes.map` callback with:

```ts
const rules = registry[change.typeName] ?? [];
const verdicts: ChangeVerdict[] = [];

for (const polarity of expandPolarity(getPolarity(change.pointer, usage))) {
  const ctx = {
    polarity,
    specVersion,
    base: (pointer: string) => base.get(pointer),
    revision: (pointer: string) => revision.get(pointer),
  };
  for (const rule of rules) {
    const verdict = rule.visit(change, ctx);
    if (!verdict) continue;
    // a 'both'-polarity node can fire the same rule twice with the same message
    if (!verdicts.some((v) => v.ruleId === rule.id && v.message === verdict.message)) {
      verdicts.push({ ruleId: rule.id, ...verdict });
    }
  }
}

verdicts.sort(
  (a, b) => compatRank(b.compat) - compatRank(a.compat) || a.ruleId.localeCompare(b.ruleId)
);

return {
  ...change,
  compat: verdicts[0]?.compat ?? 'non-breaking',
  ...(verdicts.length ? { verdicts } : {}),
};
```

(import `ChangeVerdict` from `../types.js`; the `Verdict` import stays for the rule return type).

- [ ] **Step 4: Update the serializers to render all verdicts**

`serializers/stylish.ts` (still the flat layout until Task 6):

```ts
for (const change of sorted) {
  const verdicts = change.verdicts ?? [];
  const messages = verdicts.length
    ? gray(` — ${verdicts.map((v) => `${v.message} (${v.ruleId})`).join(' ')}`)
    : '';
  lines.push(`${ICONS[change.compat]}  ${bold(change.kind)}  ${label(change)}${messages}`);
}
```

`serializers/markdown.ts`, details cell:

```ts
const details = (change.verdicts ?? [])
  .map((v) => `${escapeCell(v.message)} \`${v.ruleId}\``)
  .join('<br>');
```

`serializers/html.ts`, in `renderChange` replace the `msg` and `rules` spans with:

```ts
        ${(change.verdicts ?? [])
          .map(
            (v) =>
              `<span class="msg">${escapeHtml(v.message)}</span> <span class="rules">${escapeHtml(
                v.ruleId
              )}</span>`
          )
          .join(' ')}
```

- [ ] **Step 5: Update remaining tests**

- `engine/__tests__/diff-documents.test.ts`: replace the `ruleIds` assertion with:

```ts
expect(becameRequired.verdicts).toEqual([
  {
    ruleId: 'parameter-became-required',
    compat: 'breaking',
    message: 'Parameter became required.',
  },
]);
```

- `__tests__/serializers.test.ts` and `__tests__/serializers-rich.test.ts`: in fixtures, replace every `ruleIds: [...]` + `message: '...'` pair with `verdicts: [{ ruleId: '...', compat: <the change's compat>, message: '...' }]`; assertions that look for rule ids or messages in output remain valid.

- [ ] **Step 6: Verify green**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff && npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/commands/diff
git commit -m "feat(cli): keep every rule verdict on diff changes

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Visible `--fail-on` failure, `--output` note, execution time

**Files:**

- Create: `packages/cli/src/commands/diff/fail-on.ts`
- Modify: `packages/cli/src/commands/diff/index.ts`
- Test: `packages/cli/src/commands/diff/__tests__/fail-on.test.ts`

**Interfaces:**

- Consumes: `DiffSummary` from Task 1.
- Produces: `export type DiffFailOn = 'breaking' | 'none'` and `export function getDiffFailure(summary: DiffSummary, failOn: DiffFailOn): string | undefined` in `fail-on.ts`. `diff/index.ts` re-exports `DiffFailOn` so `packages/cli/src/index.ts` imports keep working.

- [ ] **Step 1: Write the failing test**

Create `packages/cli/src/commands/diff/__tests__/fail-on.test.ts`:

```ts
import { getDiffFailure } from '../fail-on.js';

describe('getDiffFailure', () => {
  it('fails when breaking changes exist and fail-on is breaking', () => {
    expect(getDiffFailure({ breaking: 2, nonBreaking: 1 }, 'breaking')).toBe(
      '❌ Diff failed with 2 breaking changes.'
    );
    expect(getDiffFailure({ breaking: 1, nonBreaking: 0 }, 'breaking')).toBe(
      '❌ Diff failed with 1 breaking change.'
    );
  });

  it('passes when there are no breaking changes', () => {
    expect(getDiffFailure({ breaking: 0, nonBreaking: 5 }, 'breaking')).toBeUndefined();
  });

  it('never fails when fail-on is none', () => {
    expect(getDiffFailure({ breaking: 3, nonBreaking: 0 }, 'none')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff/__tests__/fail-on.test.ts`
Expected: FAIL — `fail-on.js` does not exist.

- [ ] **Step 3: Implement `fail-on.ts`**

```ts
import { pluralize } from '@redocly/openapi-core';

import type { DiffSummary } from './engine/types.js';

export type DiffFailOn = 'breaking' | 'none';

export function getDiffFailure(summary: DiffSummary, failOn: DiffFailOn): string | undefined {
  if (failOn === 'breaking' && summary.breaking > 0) {
    return `❌ Diff failed with ${summary.breaking} breaking ${pluralize(
      'change',
      summary.breaking
    )}.`;
  }
  return undefined;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff/__tests__/fail-on.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire into the handler**

In `packages/cli/src/commands/diff/index.ts`:

- Delete the local `export type DiffFailOn = …` line; instead add:

```ts
import { getDiffFailure, type DiffFailOn } from './fail-on.js';

export type { DiffFailOn };
```

- Extend the existing `../../utils/miscellaneous.js` import with `printExecutionTime`.
- Replace `handleDiff` with:

```ts
export async function handleDiff({ argv, config, collectSpecData }: CommandArgs<DiffArgv>) {
  const startedAt = performance.now();
  const [{ path: basePath }] = await getFallbackApisOrExit([argv.base], config);
  const [{ path: revisionPath }] = await getFallbackApisOrExit([argv.revision], config);

  const { bundle: baseDocument } = await bundle({ config, ref: basePath });
  const { bundle: revisionDocument } = await bundle({ config, ref: revisionPath });
  collectSpecData?.(revisionDocument.parsed);

  let result: DiffResult;
  try {
    result = diffDocuments({ base: baseDocument, revision: revisionDocument, config });
  } catch (error) {
    if (error instanceof DiffError) {
      return exitWithError(error.message);
    }
    throw error;
  }

  const output = SERIALIZERS[argv.format](result);
  if (argv.output) {
    writeFileSync(argv.output, output);
    logger.info(`Diff report written to ${argv.output}.\n`);
  } else {
    logger.output(output + '\n');
  }

  printExecutionTime('diff', startedAt, `${basePath} vs ${revisionPath}`);

  const failure = getDiffFailure(result.summary, argv['fail-on']);
  if (failure) {
    logger.error(`${failure}\n`);
    throw new AbortFlowError('Diff failed.');
  }
}
```

(The message is printed with `logger.error` BEFORE throwing because `commandWrapper` swallows `AbortFlowError` messages — see `packages/cli/src/wrapper.ts:94-95`. This mirrors lint's `printLintTotals` + bare `AbortFlowError` convention.)

- [ ] **Step 6: Verify green**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff && npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Manual smoke check**

```bash
npm run compile
node packages/cli/bin/cli.js diff resources/cafe.yaml resources/__cafe-pre-release.yaml --fail-on=breaking; echo "exit: $?"
```

Expected: if the two cafe versions contain breaking changes, stderr shows `❌ Diff failed with N breaking change(s).` and `exit: 1`; with `--fail-on=none` the same invocation prints `exit: 0`. Either way the execution-time line (`… diff processed in …ms`) must appear.

- [ ] **Step 8: Commit**

```bash
git add packages/cli/src/commands/diff packages/cli/src/index.ts
git commit -m "fix(cli): report diff --fail-on failure visibly and print execution time

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Extend core `OutputFormat` with `html`; derive `DiffOutputFormat`

**Files:**

- Modify: `packages/core/src/format/format.ts:50-59`
- Modify: `packages/cli/src/commands/diff/index.ts`
- Modify: `packages/cli/src/index.ts:99-101`

**Interfaces:**

- Produces: core `OutputFormat` union includes `'html'`; `export type DiffOutputFormat = Extract<OutputFormat, 'stylish' | 'json' | 'markdown' | 'html'>` in `diff/index.ts` (same four values as before — `SERIALIZERS` keeps working unchanged).

- [ ] **Step 1: Add `'html'` to the core union**

In `packages/core/src/format/format.ts`:

```ts
export type OutputFormat =
  | 'codeframe'
  | 'stylish'
  | 'json'
  | 'checkstyle'
  | 'codeclimate'
  | 'summary'
  | 'github-actions'
  | 'markdown'
  | 'junit'
  | 'html';
```

(`formatProblems`'s switch simply has no `html` case; no command passes it there, so behavior is unchanged.)

- [ ] **Step 2: Derive `DiffOutputFormat` from core**

In `packages/cli/src/commands/diff/index.ts` replace the local union with:

```ts
import type { OutputFormat } from '@redocly/openapi-core';

export type DiffOutputFormat = Extract<OutputFormat, 'stylish' | 'json' | 'markdown' | 'html'>;
```

In `packages/cli/src/index.ts` diff command, type the choices via the derived type:

```ts
          format: {
            description: 'Use a specific output format.',
            choices: ['stylish', 'json', 'markdown', 'html'] as ReadonlyArray<DiffOutputFormat>,
            default: 'stylish' as const,
          },
```

(add `DiffOutputFormat` to the existing type-import from `./commands/diff/index.js`).

- [ ] **Step 3: Verify green**

Run: `npm run typecheck && VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/format/format.ts packages/cli/src/commands/diff/index.ts packages/cli/src/index.ts
git commit -m "refactor(cli): derive diff output format from core OutputFormat

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Locations on change sides (`file`/`line`/`col`)

**Files:**

- Create: `packages/cli/src/commands/diff/engine/locate.ts`
- Modify: `packages/cli/src/commands/diff/engine/types.ts` (`ChangeSide`)
- Modify: `packages/cli/src/commands/diff/engine/index.ts` (call `locateChanges`)
- Test: `packages/cli/src/commands/diff/engine/__tests__/locate.test.ts`, extend `diff-documents.test.ts`

**Interfaces:**

- Consumes: `Document.source: Source` (each side's bundled document), core `getLineColLocation(location: { source, pointer, reportOnKey }) => { start: { line, col } }`, core `Source` (has `.absoluteRef`).
- Produces: `export function locateChanges(changes: Change[], baseSource: Source, revisionSource: Source): Change[]`; `ChangeSide` becomes:

```ts
export interface ChangeSide {
  pointer: string; // real JSON Pointer in this document
  file?: string; // absoluteRef of the side's document — filled by locateChanges()
  line?: number; // 1-based — filled by locateChanges()
  col?: number; // 1-based — filled by locateChanges()
  value?: unknown;
}
```

Known limitation to note in a comment: pointers that only exist in the bundled document (nodes inlined from other files) do not resolve in the root source AST — `getLineColLocation` falls back to `1:1`.

- [ ] **Step 1: Write the failing test**

Create `packages/cli/src/commands/diff/engine/__tests__/locate.test.ts`:

```ts
import { makeDocumentFromString } from '@redocly/openapi-core';
import { outdent } from 'outdent';

import { locateChanges } from '../locate.js';
import type { Change } from '../types.js';

const BASE_YAML = outdent`
  openapi: 3.1.0
  info: { title: T, version: '1' }
`;

const REVISION_YAML = outdent`
  openapi: 3.1.0
  info:
    title: T2
    version: '1'
`;

describe('locateChanges', () => {
  it('attaches file, line, and col to each present side', () => {
    const base = makeDocumentFromString(BASE_YAML, 'base.yaml');
    const revision = makeDocumentFromString(REVISION_YAML, 'rev.yaml');
    const changes: Change[] = [
      {
        pointer: '#/info',
        property: 'title',
        kind: 'changed',
        typeName: 'Info',
        base: { pointer: '#/info/title', value: 'T' },
        revision: { pointer: '#/info/title', value: 'T2' },
        compat: 'non-breaking',
      },
    ];

    const [located] = locateChanges(changes, base.source, revision.source);
    expect(located.base).toMatchObject({ file: 'base.yaml', line: 2 });
    expect(located.revision).toMatchObject({ file: 'rev.yaml', line: 3 });
    expect(located.revision?.col).toBeGreaterThan(1);
  });

  it('falls back to 1:1 for pointers missing from the source', () => {
    const base = makeDocumentFromString(BASE_YAML, 'base.yaml');
    const revision = makeDocumentFromString(REVISION_YAML, 'rev.yaml');
    const changes: Change[] = [
      {
        pointer: '#/components/schemas/Ghost',
        kind: 'removed',
        typeName: 'Schema',
        base: { pointer: '#/components/schemas/Ghost', value: {} },
        compat: 'breaking',
      },
    ];

    const [located] = locateChanges(changes, base.source, revision.source);
    expect(located.base).toMatchObject({ file: 'base.yaml', line: 1, col: 1 });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff/engine/__tests__/locate.test.ts`
Expected: FAIL — `locate.js` does not exist.

- [ ] **Step 3: Add the `ChangeSide` fields and implement `locate.ts`**

Update `ChangeSide` in `engine/types.ts` exactly as shown in Interfaces above.

Create `packages/cli/src/commands/diff/engine/locate.ts`:

```ts
import { getLineColLocation } from '@redocly/openapi-core';

import type { Source } from '@redocly/openapi-core';
import type { Change, ChangeSide } from './types.js';

// Nodes inlined by bundling do not exist in the root source AST;
// getLineColLocation falls back to 1:1 for such pointers.
function locateSide(side: ChangeSide, source: Source): ChangeSide {
  const { start } = getLineColLocation({ source, pointer: side.pointer, reportOnKey: false });
  return { ...side, file: source.absoluteRef, line: start.line, col: start.col };
}

export function locateChanges(
  changes: Change[],
  baseSource: Source,
  revisionSource: Source
): Change[] {
  return changes.map((change) => ({
    ...change,
    ...(change.base ? { base: locateSide(change.base, baseSource) } : {}),
    ...(change.revision ? { revision: locateSide(change.revision, revisionSource) } : {}),
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff/engine/__tests__/locate.test.ts`
Expected: PASS. If a `line` assertion is off by one, inspect the actual value — `reportOnKey: false` locates the VALUE node — and fix the implementation (not the test) unless the actual location is correct on inspection.

- [ ] **Step 5: Wire into `diffDocuments`**

In `packages/cli/src/commands/diff/engine/index.ts`:

```ts
import { locateChanges } from './locate.js';
```

and wrap the classify call:

```ts
const changes = locateChanges(
  classifyChanges({
    changes: rawChanges,
    specVersion: revisionVersion,
    base: baseCollected.entries,
    revision: revisionCollected.entries,
    usage,
  }),
  base.source,
  revision.source
);
```

- [ ] **Step 6: Extend the integration test**

In `engine/__tests__/diff-documents.test.ts`, change the two `makeDocumentFromString` calls in the first test to use `'base.yaml'` and `'rev.yaml'` as the second argument, and add after the existing `becameRequired` assertions:

```ts
expect(becameRequired.base).toMatchObject({ file: 'base.yaml' });
expect(becameRequired.revision).toMatchObject({ file: 'rev.yaml' });
expect(becameRequired.revision?.line).toBeGreaterThan(1);
```

- [ ] **Step 7: Verify green**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff && npm run typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/cli/src/commands/diff
git commit -m "feat(cli): attach file/line/col locations to diff change sides

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Stylish output grouped per operation, rendering all verdicts

**Files:**

- Rewrite: `packages/cli/src/commands/diff/serializers/stylish.ts`
- Test: `packages/cli/src/commands/diff/__tests__/serializers.test.ts` (stylish portion)

**Interfaces:**

- Consumes: `Change.base/revision` with `file`/`line`/`col` from Task 5; `Change.verdicts` from Task 2; core `unescapePointerFragment`.
- Produces: `stylishDiff(result: DiffResult): string` (signature unchanged). Display rules: group header derived from the DISPLAY SIDE's real pointer (base side for `removed`, revision side otherwise) so real path templates are shown; change label derived from the stable pointer with the `paths/<path>/<method>/` prefix stripped; EVERY verdict is rendered on its own line; a gray `      at <relative-file>:<line>:<col>` line closes each change.

Example output shape:

```
GET /pets
  ✖ breaking      changed  parameters/{query:limit} · required
      Parameter became required. (parameter-became-required)
      at rev.yaml:11:21
  ✔ non-breaking  changed  responses/200 · description
      at rev.yaml:14:16

components
  ✔ non-breaking  added  components/schemas/Pet
      at rev.yaml:16:3

1 breaking, 2 non-breaking.
```

- [ ] **Step 1: Write the failing test**

In `packages/cli/src/commands/diff/__tests__/serializers.test.ts`, rebuild the shared fixture so every side includes `file`/`line`/`col` and classification uses `verdicts`:

```ts
const RESULT: DiffResult = {
  version: '1',
  specVersions: { base: 'oas3_1', revision: 'oas3_1' },
  summary: { breaking: 3, nonBreaking: 1 },
  changes: [
    {
      pointer: '#/paths/~1pets/get/parameters/{query:limit}',
      property: 'required',
      kind: 'changed',
      typeName: 'Parameter',
      base: {
        pointer: '#/paths/~1pets/get/parameters/0/required',
        file: '/abs/base.yaml',
        line: 9,
        col: 21,
        value: false,
      },
      revision: {
        pointer: '#/paths/~1pets/get/parameters/1/required',
        file: '/abs/rev.yaml',
        line: 11,
        col: 21,
        value: true,
      },
      compat: 'breaking',
      verdicts: [
        {
          ruleId: 'parameter-became-required',
          compat: 'breaking',
          message: 'Parameter became required.',
        },
      ],
    },
    {
      pointer: '#/paths/~1pets/get/requestBody',
      property: 'schema',
      kind: 'changed',
      typeName: 'RequestBody',
      base: {
        pointer: '#/paths/~1pets/get/requestBody/schema',
        file: '/abs/base.yaml',
        line: 14,
        col: 9,
        value: '#/components/schemas/A',
      },
      revision: {
        pointer: '#/paths/~1pets/get/requestBody/schema',
        file: '/abs/rev.yaml',
        line: 14,
        col: 9,
        value: '#/components/schemas/B',
      },
      compat: 'breaking',
      verdicts: [
        { ruleId: 'ref-target-changed', compat: 'breaking', message: 'Reference target changed.' },
      ],
    },
    {
      pointer: '#/paths/~1pets/delete',
      kind: 'removed',
      typeName: 'Operation',
      base: {
        pointer: '#/paths/~1pets/delete',
        file: '/abs/base.yaml',
        line: 30,
        col: 3,
        value: {},
      },
      compat: 'breaking',
      verdicts: [
        { ruleId: 'operation-removed', compat: 'breaking', message: 'Operation was removed.' },
      ],
    },
    {
      pointer: '#/components/schemas/Pet',
      kind: 'added',
      typeName: 'Schema',
      revision: {
        pointer: '#/components/schemas/Pet',
        file: '/abs/rev.yaml',
        line: 20,
        col: 5,
        value: { type: 'object' },
      },
      compat: 'non-breaking',
    },
  ],
};
```

New stylish assertions:

```ts
it('groups stylish output per operation with locations and all verdicts', () => {
  // colorette is auto-disabled under vitest (no TTY), so plain substrings work
  const output = stylishDiff(RESULT);

  expect(output).toContain('GET /pets');
  expect(output).toContain('DELETE /pets');
  expect(output).toContain('components');
  expect(output).toContain('Parameter became required. (parameter-became-required)');
  expect(output).toMatch(/at .*rev\.yaml:11:21/);
  expect(output).toMatch(/at .*rev\.yaml:20:5/);
  // removed changes point at the base file, others at the revision file:
  expect(output).toMatch(/at .*base\.yaml:30:3/);
  expect(output).toContain('parameters/{query:limit} · required');
  expect(output).toContain('3 breaking, 1 non-breaking.');
});
```

Update the markdown/html tests in the same file to the new fixture only where they referenced the old change list (their `verdicts` rendering was already covered in Task 2).

- [ ] **Step 2: Run it to verify it fails**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff/__tests__/serializers.test.ts`
Expected: FAIL — old stylish output has no groups or `at …` lines.

- [ ] **Step 3: Rewrite `serializers/stylish.ts`**

```ts
import * as path from 'node:path';

import { unescapePointerFragment } from '@redocly/openapi-core';
import { blue, bold, gray, green, red } from 'colorette';

import type { Change, ChangeSide, Compat, DiffResult } from '../engine/types.js';

const SEVERITY_ORDER: Compat[] = ['breaking', 'non-breaking'];

const ICONS: Record<Compat, string> = {
  breaking: red('✖ breaking    '),
  'non-breaking': green('✔ non-breaking'),
};

const HTTP_METHODS = new Set([
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
  'query',
]);

// The side shown to the user: what was removed lives in the base document,
// everything else is best inspected in the revision.
function displaySide(change: Change): ChangeSide | undefined {
  return change.kind === 'removed'
    ? (change.base ?? change.revision)
    : (change.revision ?? change.base);
}

// Identity keys escape '/' (node-identity.ts), so plain splitting is safe.
function segmentsOf(pointer: string): string[] {
  return pointer.replace(/^#\//, '').split('/');
}

function groupOf(change: Change): string {
  const segments = segmentsOf(displaySide(change)?.pointer ?? change.pointer);
  if (segments[0] === 'paths' && segments.length > 1) {
    const pathKey = unescapePointerFragment(segments[1]);
    const method = segments[2];
    return method && HTTP_METHODS.has(method) ? `${method.toUpperCase()} ${pathKey}` : pathKey;
  }
  return segments[0] || 'document';
}

function labelOf(change: Change): string {
  const segments = segmentsOf(change.pointer);
  const rest =
    segments[0] === 'paths'
      ? segments.length > 2 && HTTP_METHODS.has(segments[2])
        ? segments.slice(3)
        : segments.slice(2)
      : segments;
  const label = rest.join('/') || segments.join('/');
  return change.property ? `${label} · ${change.property}` : label;
}

function locationOf(change: Change, cwd: string): string | undefined {
  const side = displaySide(change);
  if (!side?.file) return undefined;
  const file = /^https?:\/\//.test(side.file) ? side.file : path.relative(cwd, side.file);
  return `${file}:${side.line}:${side.col}`;
}

export function stylishDiff(result: DiffResult): string {
  const cwd = process.cwd();
  const groups = new Map<string, Change[]>();
  for (const change of result.changes) {
    const key = groupOf(change);
    const group = groups.get(key) ?? [];
    group.push(change);
    groups.set(key, group);
  }

  const lines: string[] = [];
  for (const [key, changes] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(bold(blue(key)));
    const sorted = [...changes].sort(
      (a, b) =>
        SEVERITY_ORDER.indexOf(a.compat) - SEVERITY_ORDER.indexOf(b.compat) ||
        a.pointer.localeCompare(b.pointer)
    );
    for (const change of sorted) {
      lines.push(`  ${ICONS[change.compat]}  ${bold(change.kind)}  ${labelOf(change)}`);
      for (const verdict of change.verdicts ?? []) {
        lines.push(gray(`      ${verdict.message} (${verdict.ruleId})`));
      }
      const location = locationOf(change, cwd);
      if (location) lines.push(gray(`      at ${location}`));
    }
    lines.push('');
  }

  const { breaking, nonBreaking } = result.summary;
  lines.push(`${red(`${breaking} breaking`)}, ${green(`${nonBreaking} non-breaking`)}.`);
  return lines.join('\n');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff`
Expected: PASS (fix `serializers-rich.test.ts` expectations if they asserted the old flat layout).

- [ ] **Step 5: Manual smoke check**

```bash
npm run compile
node packages/cli/bin/cli.js diff resources/cafe.yaml resources/__cafe-pre-release.yaml --fail-on=none
```

Expected: changes grouped under headers like `GET /coffee` (real operations from the cafe spec), every verdict on its own line, and a gray `at resources/….yaml:<line>:<col>` line that is cmd-clickable in the terminal.

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/diff
git commit -m "feat(cli): group diff stylish output per operation with locations and verdicts

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Path-parameter rename matching at the compare stage

Collect stays untouched: each side's stable pointers remain truthful to its own document. A new `alignRenamedPaths` step runs BEFORE `compareMaps`: it finds path templates present on only one side, matches them by parameter-position-normalized form (`/pet/{id}` and `/pet/{petId}` both normalize to `/pet/{0}`), and — only when the match is unambiguous 1:1 on BOTH sides — re-keys the revision entries into the base pointer space. Each match also emits an explicit rename change (`property: 'path'`, non-breaking), so the rename is visible in every output format. Ambiguous matches are left alone and diff as remove+add, so no collisions are possible.

**Files:**

- Create: `packages/cli/src/commands/diff/engine/align-paths.ts`
- Modify: `packages/cli/src/commands/diff/engine/node-identity.ts` (export the escape helper)
- Modify: `packages/cli/src/commands/diff/engine/index.ts`
- Test: `packages/cli/src/commands/diff/engine/__tests__/align-paths.test.ts`, extend `diff-documents.test.ts`

**Interfaces:**

- Consumes: `NodeEntry` from `types.ts`; core `unescapePointerFragment`.
- Produces:

```ts
export interface PathRename {
  baseTemplate: string; // '/pet/{id}'
  revisionTemplate: string; // '/pet/{petId}'
  basePointer: string; // stable pointer, '#/paths/~1pet~1{id}'
  revisionPointer: string; // original revision stable pointer
  baseRealPointer: string;
  revisionRealPointer: string;
}

export function alignRenamedPaths(
  base: Map<string, NodeEntry>,
  revision: Map<string, NodeEntry>
): { revision: Map<string, NodeEntry>; renames: PathRename[] };
```

`node-identity.ts` renames its private `esc` to an exported `escapeIdentityKeyPart` (same body) so `align-paths.ts` builds `{path:<name>}` segments identically.

- [ ] **Step 1: Write the failing unit test**

Create `packages/cli/src/commands/diff/engine/__tests__/align-paths.test.ts`:

```ts
import { alignRenamedPaths } from '../align-paths.js';
import type { NodeEntry } from '../types.js';

function entry(pointer: string, typeName: string, parentPointer: string | null): NodeEntry {
  return { pointer, realPointer: pointer, parentPointer, typeName, scalars: {}, refs: {}, raw: {} };
}

function side(template: string, paramName: string): Map<string, NodeEntry> {
  const escaped = template.replace(/\//g, '~1');
  const p = `#/paths/${escaped}`;
  return new Map([
    [p, entry(p, 'PathItem', '#/paths')],
    [`${p}/get`, entry(`${p}/get`, 'Operation', p)],
    [
      `${p}/get/parameters/{path:${paramName}}`,
      entry(`${p}/get/parameters/{path:${paramName}}`, 'Parameter', `${p}/get/parameters`),
    ],
  ]);
}

describe('alignRenamedPaths', () => {
  it('aliases an unambiguous renamed path into the base pointer space', () => {
    const base = side('/pet/{id}', 'id');
    const revision = side('/pet/{petId}', 'petId');

    const { revision: aligned, renames } = alignRenamedPaths(base, revision);

    // the fixture builds realPointer === pointer, so real pointers keep each
    // side's own template
    expect(renames).toEqual([
      {
        baseTemplate: '/pet/{id}',
        revisionTemplate: '/pet/{petId}',
        basePointer: '#/paths/~1pet~1{id}',
        revisionPointer: '#/paths/~1pet~1{petId}',
        baseRealPointer: '#/paths/~1pet~1{id}',
        revisionRealPointer: '#/paths/~1pet~1{petId}',
      },
    ]);
    expect(aligned.has('#/paths/~1pet~1{id}')).toBe(true);
    expect(aligned.has('#/paths/~1pet~1{id}/get/parameters/{path:id}')).toBe(true);
    // real pointers keep the revision's original template — the rename stays visible
    expect(aligned.get('#/paths/~1pet~1{id}')!.realPointer).toBe('#/paths/~1pet~1{petId}');
  });

  it('leaves ambiguous matches alone', () => {
    const base = side('/a/{x}/b', 'x');
    const revision = new Map([...side('/a/{y}/b', 'y'), ...side('/a/{z}/b', 'z')]);

    const { revision: aligned, renames } = alignRenamedPaths(base, revision);

    expect(renames).toEqual([]);
    expect(aligned).toBe(revision); // untouched
  });

  it('is a no-op when templates match exactly', () => {
    const base = side('/pet/{id}', 'id');
    const revision = side('/pet/{id}', 'id');

    const { renames } = alignRenamedPaths(base, revision);
    expect(renames).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff/engine/__tests__/align-paths.test.ts`
Expected: FAIL — `align-paths.js` does not exist.

- [ ] **Step 3: Export the identity-escape helper**

In `packages/cli/src/commands/diff/engine/node-identity.ts`, rename the private `esc` function to `escapeIdentityKeyPart` and export it (update the internal call sites in `IDENTITY_KEYS`).

- [ ] **Step 4: Implement `align-paths.ts`**

Create `packages/cli/src/commands/diff/engine/align-paths.ts`:

```ts
import { unescapePointerFragment } from '@redocly/openapi-core';

import { escapeIdentityKeyPart } from './node-identity.js';
import type { NodeEntry } from './types.js';

export interface PathRename {
  baseTemplate: string;
  revisionTemplate: string;
  basePointer: string;
  revisionPointer: string;
  baseRealPointer: string;
  revisionRealPointer: string;
}

const TEMPLATE_PARAM = /\{([^}]+)\}/g;

function normalizeTemplate(template: string): string {
  let index = 0;
  return template.replace(TEMPLATE_PARAM, () => `{${index++}}`);
}

function paramNames(template: string): string[] {
  return [...template.matchAll(TEMPLATE_PARAM)].map((m) => m[1]);
}

// raw path template → stable PathItem pointer
function pathTemplates(entries: Map<string, NodeEntry>): Map<string, string> {
  const result = new Map<string, string>();
  for (const entry of entries.values()) {
    if (entry.typeName === 'PathItem' && entry.parentPointer === '#/paths') {
      result.set(unescapePointerFragment(entry.pointer.slice('#/paths/'.length)), entry.pointer);
    }
  }
  return result;
}

function groupByNormalized(templates: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const template of templates) {
    const normalized = normalizeTemplate(template);
    groups.set(normalized, [...(groups.get(normalized) ?? []), template]);
  }
  return groups;
}

// Matches path templates that differ only in parameter names and re-keys the
// revision entries into the base pointer space. Only unambiguous 1:1 matches
// are aliased — anything else keeps its own keys and diffs as remove+add.
export function alignRenamedPaths(
  base: Map<string, NodeEntry>,
  revision: Map<string, NodeEntry>
): { revision: Map<string, NodeEntry>; renames: PathRename[] } {
  const baseTemplates = pathTemplates(base);
  const revisionTemplates = pathTemplates(revision);

  const baseGroups = groupByNormalized(
    [...baseTemplates.keys()].filter((t) => !revisionTemplates.has(t))
  );
  const revisionGroups = groupByNormalized(
    [...revisionTemplates.keys()].filter((t) => !baseTemplates.has(t))
  );

  const renames: PathRename[] = [];
  for (const [normalized, baseCandidates] of baseGroups) {
    const revisionCandidates = revisionGroups.get(normalized) ?? [];
    if (baseCandidates.length !== 1 || revisionCandidates.length !== 1) continue;
    const [baseTemplate] = baseCandidates;
    const [revisionTemplate] = revisionCandidates;
    const basePointer = baseTemplates.get(baseTemplate)!;
    const revisionPointer = revisionTemplates.get(revisionTemplate)!;
    renames.push({
      baseTemplate,
      revisionTemplate,
      basePointer,
      revisionPointer,
      baseRealPointer: base.get(basePointer)!.realPointer,
      revisionRealPointer: revision.get(revisionPointer)!.realPointer,
    });
  }

  if (!renames.length) return { revision, renames };

  const rewrites = renames.map((rename) => ({
    fromPrefix: rename.revisionPointer,
    toPrefix: rename.basePointer,
    // positional mapping of revision param names to base param names,
    // pre-escaped the way node-identity builds '{path:<name>}' segments
    paramMap: new Map(
      paramNames(rename.revisionTemplate).map((name, i) => [
        escapeIdentityKeyPart(name),
        escapeIdentityKeyPart(paramNames(rename.baseTemplate)[i]),
      ])
    ),
  }));

  const rewriteKey = (key: string): string => {
    for (const { fromPrefix, toPrefix, paramMap } of rewrites) {
      if (key !== fromPrefix && !key.startsWith(fromPrefix + '/')) continue;
      const suffix = key
        .slice(fromPrefix.length)
        .split('/')
        .map((segment) => {
          const match = segment.match(/^\{path:(.+)\}$/);
          const mapped = match && paramMap.get(match[1]);
          return mapped ? `{path:${mapped}}` : segment;
        })
        .join('/');
      return toPrefix + suffix;
    }
    return key;
  };

  const aliased = new Map<string, NodeEntry>();
  for (const [key, entry] of revision) {
    const newKey = rewriteKey(key);
    aliased.set(newKey, {
      ...entry,
      pointer: newKey,
      parentPointer: entry.parentPointer === null ? null : rewriteKey(entry.parentPointer),
    });
  }
  return { revision: aliased, renames };
}
```

(No key collisions are possible: `toPrefix` corresponds to a base-only template, so `#/paths/<base template>` cannot already exist as a revision key; ambiguous normalized groups are skipped entirely.)

- [ ] **Step 5: Run the unit test to verify it passes**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff/engine/__tests__/align-paths.test.ts`
Expected: PASS.

- [ ] **Step 6: Wire into `diffDocuments` with an explicit rename change**

In `packages/cli/src/commands/diff/engine/index.ts`:

```ts
import { alignRenamedPaths, type PathRename } from './align-paths.js';
import type { DiffResult, DiffSummary, RawChange } from './types.js';
```

Add above `diffDocuments`:

```ts
// The path template itself is a map key, not a node property, so the rename is
// surfaced as a synthetic 'changed' on the PathItem with property 'path'.
function toRenameChange(rename: PathRename): RawChange {
  return {
    pointer: rename.basePointer,
    property: 'path',
    kind: 'changed',
    typeName: 'PathItem',
    base: { pointer: rename.baseRealPointer, value: rename.baseTemplate },
    revision: { pointer: rename.revisionRealPointer, value: rename.revisionTemplate },
  };
}
```

Inside `diffDocuments`, replace the compare/classify block with:

```ts
const { revision: alignedRevision, renames } = alignRenamedPaths(
  baseCollected.entries,
  revisionCollected.entries
);

const rawChanges = [
  ...renames.map(toRenameChange),
  ...compareMaps(baseCollected.entries, alignedRevision),
];
// usage edges are NOT rewritten: polarity only inspects 'parameters'/'responses'
// segments and component roots, which a path rename never alters
const usage = new UsageIndex([...baseCollected.usageEdges, ...revisionCollected.usageEdges]);

const changes = locateChanges(
  classifyChanges({
    changes: rawChanges,
    specVersion: revisionVersion,
    base: baseCollected.entries,
    revision: alignedRevision,
    usage,
  }),
  base.source,
  revision.source
);
```

- [ ] **Step 7: Write the failing integration test**

Add to `engine/__tests__/diff-documents.test.ts`:

```ts
it('matches renamed path parameters instead of remove+add', async () => {
  const config = await createConfig({});
  const makeSpec = (param: string) => outdent`
      openapi: 3.1.0
      info: { title: T, version: '1' }
      paths:
        /pet/{${param}}:
          get:
            parameters:
              - name: ${param}
                in: path
                required: true
                schema: { type: string }
            responses:
              '200': { description: OK }
    `;
  const result = diffDocuments({
    base: makeDocumentFromString(makeSpec('id'), 'base.yaml'),
    revision: makeDocumentFromString(makeSpec('petId'), 'rev.yaml'),
    config,
  });

  expect(result.summary.breaking).toBe(0);

  // the rename itself is an explicit, non-breaking change
  const renameChange = result.changes.find((c) => c.property === 'path')!;
  expect(renameChange).toMatchObject({
    pointer: '#/paths/~1pet~1{id}',
    kind: 'changed',
    typeName: 'PathItem',
    compat: 'non-breaking',
  });
  expect(renameChange.base?.value).toBe('/pet/{id}');
  expect(renameChange.revision?.value).toBe('/pet/{petId}');

  // the parameter matched; only its name changed
  const nameChange = result.changes.find((c) => c.property === 'name')!;
  expect(nameChange).toMatchObject({
    kind: 'changed',
    compat: 'non-breaking',
    pointer: '#/paths/~1pet~1{id}/get/parameters/{path:id}',
  });
  expect(nameChange.base?.value).toBe('id');
  expect(nameChange.revision?.value).toBe('petId');
});

it('reports ambiguous path renames as remove+add', async () => {
  const config = await createConfig({});
  const base = makeDocumentFromString(
    outdent`
        openapi: 3.1.0
        info: { title: T, version: '1' }
        paths:
          /a/{x}/b:
            get:
              responses:
                '200': { description: OK }
      `,
    'base.yaml'
  );
  const revision = makeDocumentFromString(
    outdent`
        openapi: 3.1.0
        info: { title: T, version: '1' }
        paths:
          /a/{y}/b:
            get:
              responses:
                '200': { description: OK }
          /a/{z}/b:
            get:
              responses:
                '200': { description: OK }
      `,
    'rev.yaml'
  );
  const result = diffDocuments({ base, revision, config });

  const kinds = result.changes.map((c) => c.kind).sort();
  expect(kinds).toEqual(['added', 'added', 'removed']);
  expect(result.changes.find((c) => c.property === 'path')).toBeUndefined();
});
```

- [ ] **Step 8: Run to verify, then make green**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff/engine/__tests__/diff-documents.test.ts`
Expected: PASS after Step 6's wiring (Steps 6 and 7 may be done in either order; both must be green here). All pre-existing tests must also stay green — paths without renames are untouched by `alignRenamedPaths`.

- [ ] **Step 9: Verify green + typecheck**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff && npm run typecheck`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add packages/cli/src/commands/diff
git commit -m "feat(cli): match renamed path parameters at the diff compare stage

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Documentation update

**Files:**

- Modify: `docs/@v2/commands/diff.md`
- Modify: `.changeset/diff-command.md` (only if it mentions `warning` levels or `--fail-on=warning`)

- [ ] **Step 1: Update the docs page**

In `docs/@v2/commands/diff.md`:

- Line 11: "…changes are also classified as breaking, warning, or non-breaking…" → "…changes are also classified as breaking or non-breaking…".
- Line 19 example: `--fail-on=warning` → `--fail-on=breaking`.
- Line 29 `--fail-on` row: possible values `breaking`, `none` (default `breaking`).
- Line 41: rewrite to: "Changes the tool detects but cannot judge automatically (for example, a `$ref` that now points to a different target) are conservatively reported as `breaking`."
- Line 46: replace the trailing "…reported as a `warning` rather than matched to its previous identity." with "…reported as `breaking` (`ref-target-changed`) rather than matched to its previous identity."
- Line 72 (`ref-target-changed` row): drop "(reported as `warning`)"; state it is reported as `breaking`.
- Document that each change carries ALL triggered rule verdicts (`verdicts`: rule id, level, message), with the change's level being the most severe verdict.
- Add a short subsection under the output description:

```markdown
### Locations

Each change reports the source file, line, and column of the affected node on both
sides (`base` and `revision`). In the `stylish` format, changes are grouped per
operation (for example, `GET /pets`) and each change includes a clickable
`file:line:col` reference — the base file for removals, the revision file otherwise.
For multi-file API descriptions, nodes pulled in from files referenced via `$ref`
resolve to `1:1` of the root file.

### Path parameter renaming

Renaming a path parameter (for example, `/pets/{id}` → `/pets/{petId}`) is treated
as the same endpoint, not a removal plus an addition. The rename is reported as a
non-breaking change of the path template, alongside a non-breaking change of the
parameter's `name`. If the match is ambiguous (several paths differing only in
parameter names), the paths are compared by their literal keys instead.
```

- Update the sample `stylish` output block (if present) to the new grouped format shown in Task 6.

- [ ] **Step 2: Check the changeset**

Read `.changeset/diff-command.md`; if it mentions `warning` classification or `--fail-on=warning`, align the wording. Do not create a new changeset — the command is unreleased and covered by the existing one.

- [ ] **Step 3: Full verification**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff && npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add docs/@v2/commands/diff.md .changeset/diff-command.md
git commit -m "docs: update diff command docs for two-level compat, verdicts, locations, and path-param matching

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
