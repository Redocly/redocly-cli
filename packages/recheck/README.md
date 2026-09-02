# Recheck

Recheck combines a **markdown linter** (structure/format — full markdownlint rule parity: 53 built-in rules with auto-fix) and a **prose linter** (style/voice — Vale-style scopes like `sentence`/`paragraph`/`heading` with `swap`/`pattern`/`repetition`/`consistency`/`capitalization` rules) in **one tool with one simple YAML config** — replacing a markdownlint + Vale combo with one line:

```yaml
extends: [recheck/markdown, recheck/prose]
```

Recheck is also built to be **embedded by other tools**: it exposes a library-first API (`parseMarkdown`, `extractScopes`, `lintContent`, `lintFiles`, `runRules` — see [Library API](#library-api)) so tools like Redocly CLI's `lint` command can add markdown and prose linting too, including linting markdown strings embedded inside API descriptions.

## Features

✅ **Modern Scope-Based Architecture**

- File-first processing: each file is parsed once into a [micromark](https://github.com/micromark/micromark) AST, then segmented into scopes
- Full scope vocabulary: `all`, `raw`, `summary` (alias: `default`), `sentence`, `paragraph`, `heading` (+ `heading.h1`-`h6`), `code`, `list-item`, `blockquote`, `table.header`, `table.cell`, `markdoc.tag`, `frontmatter`, `html`, `comment`, `alt`, `link`
- Selector syntax for precise targeting: `~` negates a term, `&` joins terms into a conjunction — e.g. `scope: ['~blockquote & ~heading']`
- Vale-compatible scope notation (e.g., `heading.h1`, `heading.h2`)
- Efficient rule indexing for fast processing at scale

✅ **Flexible Configuration Format**

- Modern `assertions`-based rule definitions
- `severity` levels: `off`, `info`, `warn`, `error`
- Array-based scope targeting for precise control
- Comprehensive JSON Schema validation

✅ **Production-Ready Engine**

- High-performance JavaScript engine optimized for large repositories
- Successfully processes 300+ files with 1,000+ issues efficiently
- Built-in rules for common content quality checks
- Safe auto-fix capabilities for appropriate rules

✅ **Developer-Friendly CLI**

- Table, JSON, SARIF, and GitHub Actions output formats for CI/CD integration
- Universal output-path option for file export
- Inline PR annotations with GitHub Actions format
- Severity filtering and detailed statistics
- Auto-fix with granular control
- Comprehensive error reporting

## Installation

```bash
# Navigate to the recheck package
cd packages/recheck

# Install dependencies
pnpm install

# Build the project
pnpm build
```

**Contributing to Recheck itself** (build-cache problems, `pnpm parity`'s required `--corpus` flag, the `generate-examples.mjs`/`oxfmt` coupling) is covered in [CONTRIBUTING.md](CONTRIBUTING.md), not here — this README is for people adopting Recheck as a linter.

## Usage

### Validate Configuration

```bash
# Validate with explicit config file
node dist/cli.js --validate-config --config recheck.example.yaml

# Auto-discover config file in current directory
node dist/cli.js --validate-config
```

### Run content linting

```bash
# Run on current directory
node dist/cli.js . --config recheck.example.yaml

# Run on specific file
node dist/cli.js README.md --config recheck.example.yaml

# Filter by severity (only show errors)
node dist/cli.js . --severity error

# Show all enabled rules (info and above)
node dist/cli.js . --severity info

# Work one rule at a time. This helps you clear a large list of findings.
# Give the name that the report shows, or the full config key. Use the flag
# more than one time for more than one rule. A rule from a namespace other
# than `recheck/` keeps that namespace: use `google/passive-voice`.
node dist/cli.js . --rule semantic-line-breaks
node dist/cli.js . -r us-spelling -r recheck/oxford-comma

# ...and its inverse, to silence a rule you have already triaged
node dist/cli.js . --exclude-rule semantic-line-breaks

# Use --rule with --fix to clear one rule's findings across all documents
node dist/cli.js . --rule semantic-line-breaks --fix

# A name that matches no rule in your config is an error, not an empty run:
# a misspelled filter that reported "no issues" would look the same as a
# clean document set. The error message lists the rules your config loaded.

# Output formats (table is default)
node dist/cli.js . --output table           # Human-readable table (default)
node dist/cli.js . --output json            # Structured JSON for CI
node dist/cli.js . --output sarif           # SARIF format for security tools
node dist/cli.js . --output github-actions  # GitHub Actions annotations (inline PR comments)

# Show detailed statistics
node dist/cli.js . --stats

# Auto-fix safe issues (35 fixable rules total: swap + semantic-line-breaks
# natively, plus 33 of the 53 markdownlint-parity rules — see the rule table
# under "Markdownlint parity" below for the full per-rule breakdown)
node dist/cli.js . --fix

# Combine auto-fix with statistics
node dist/cli.js . --fix --stats

# Limit annotations for CI (applies to file output, default: 20)
node dist/cli.js . --annotations-limit 50

# Output to file (works with all formats)
node dist/cli.js . --output json --output-path report.json
node dist/cli.js . --output sarif --output-path recheck.sarif
node dist/cli.js . --output json --output-path limited.json --annotations-limit 50

# Emit run summary to a file (json or text)
node dist/cli.js . --summary json --summary-path recheck-summary.json

# Scan only changed files (via file list or stdin)
# From file:
node dist/cli.js . --changed-only --changed-list changed.txt
# Or with stdin:
git diff --name-only origin/main... | node dist/cli.js . --changed-only
```

## Library API

The CLI is a thin wrapper around a public library API, published from `packages/recheck`'s `dist/index.js`.
This is the intended integration point for embedding Recheck in another tool (a build step, an editor extension, or another CLI like Redocly CLI's `lint`) rather than shelling out:

```ts
import { lintContent, lintFiles } from '@redocly/recheck';

// A config is a flat map of `recheck/<rule>` -> rule definition — the same
// shape a YAML config file resolves to once `extends` presets are expanded.
// Load from YAML (via `loadConfig`, which resolves `extends` for you) or
// build one programmatically, as here:
const config = {
  'recheck/no-hard-tabs': {
    severity: 'error' as const,
    message: 'Hard tabs',
    assertions: { 'no-hard-tabs': {} },
  },
};

// Lint an in-memory string — no file I/O. Useful for linting markdown that
// isn't on disk, e.g. a `description` field pulled out of an OpenAPI document.
const problems = await lintContent('# Title\n\nSome *text*.\n', config);

// Lint files from disk, optionally writing auto-fixes back:
const { problems: fileProblems, fixedFiles } = await lintFiles(['README.md'], config, {
  fix: true,
});
```

Key exports:

- **`parseMarkdown(content, options?)`** — parses a markdown string into a micromark-based token tree, once.
  Every other API in this list builds on this tree rather than re-parsing.
  `options.markdoc` is a boolean here: `true` also tokenizes `{% ... %}` Markdoc tag spans into `markdocTag` tokens, and `false` or omitted gives you the same tree as passing no options at all.
  The [object form](#markdoc-aware-linting-markdoc-true) (`{ schema, extend }`) is a config-file concept only — it resolves down to this boolean before any file is parsed, and `ParseOptions.markdoc` does not accept it.
- **`extractScopes(tree, content)`** — segments a parsed token tree into Vale-style scopes (`sentence`, `paragraph`, `heading`, `list-item`, `blockquote`, `table.cell`, etc.) for prose/style rules to run against.
- **`lintContent(content, config, opts?)`** — lints a single in-memory markdown string against a config; no disk access.
  Rules that need on-disk facts (e.g. `max-image-size`) require `opts.metadata` to be supplied by the caller.
- **`lintFiles(paths, config, opts?)`** — lints markdown files from disk; pass `{ fix: true }` to also write auto-fixes back, looping lint → fix → re-lint until the file converges.
  Files that can't be read are skipped (with a console warning) and reported in the returned `skippedFiles` (`{ path, reason }[]`), so callers can detect incomplete coverage programmatically.
  `opts.root` sets the lint root that image-metadata loading is confined to (default `process.cwd()`) — image refs resolving outside it are treated as missing without touching the disk.
  `opts.maxProblems` caps the total problems collected: once a file's lint pushes the run to the cap, later files aren't linted at all and the returned `truncated` flag is set.
- **`runRules(files, rules)`** — the lower-level engine entry point for callers that already have a `NormalizedRule[]` (e.g. from `loadConfig`) and want to run against an explicit in-memory file list, bypassing `lintFiles`'s own config loading/validation.
  Under `{ fix: true }` its `RunResult` separates the fixes that genuinely landed (`fixes`) from proposals dropped by overlap resolution (`skippedFixes`).
- **`applyFixesToContent(content, fixes)`** — applies `Fix` edits to a string, preserving the file's own line endings (CRLF files stay CRLF).
  Returns `{ content, applied, skipped }`: every input fix is classified as genuinely applied or skipped (overlapping edits, out-of-range lines), so callers can report what actually changed rather than every proposal.
- **`computeTextStatistics(prose)`** — computes word/sentence/syllable/character/complex-word counts for a plain prose string (not markdown — extract prose from a scope first).
  Sentence counting reuses `splitSentences` internally, so it agrees with the rest of the engine on sentence boundaries.
  Tokenization is ASCII-only by design (accented or non-Latin letters don't count as word characters), so readability scores are meaningful for English prose.
- **`computeReadability(formula, stats)`** — scores a `TextStatistics` object with one of six standard readability formulas: `flesch-reading-ease`, `flesch-kincaid-grade`, `gunning-fog`, `smog`, `coleman-liau`, `automated-readability`.
  Returns `0` (rather than `NaN`/`Infinity`) when `stats.words` or `stats.sentences` is `0`.
- **`TECHNICAL_PROPER_NOUNS`** — the [built-in technical proper-noun vocabulary](#built-in-technical-proper-noun-vocabulary) `capitalization`/`spelling` consume by default; re-exported so you can read it or build your own tooling around the same list.

This is exactly the surface a host tool needs to add both markdown-structure linting and prose/style linting to content it already has in memory — for example, linting the markdown inside an OpenAPI `description` field without writing it to a temp file first.

## Configuration Format

Configuration uses a modern `assertions`-based format with `severity` levels and flexible scope targeting.

A top-level `excludes` applies to every rule, so a path you never lint is stated once rather than repeated on each rule.
It is merged ahead of a rule's own `excludes`, which still apply:

```yaml
excludes:
  - '**/_partials/**'
  - 'CHANGELOG.md'
```

```yaml
recheck/us-spelling:
  scope: all # default
  severity: error
  message: 'Use the US spelling "%s" instead of British "%s".'
  link: https://docs.microsoft.com/en-us/style-guide/word-choice/use-us-spelling-avoid-non-english-words
  appliesTo:
    - 'docs/**' # Only apply to documentation
  assertions:
    swap:
      ignoreCase: true
      wordBoundary: true
      pairs:
        color: colour
        behavior: behaviour
        organize: organise
  exceptions:
    files: [docs/style-guide.md]
    lines:
      - "British spellings such as 'color'"

recheck/no-gerund-headings:
  severity: error
  scope:
    - heading.h1
    - heading.h2
    - heading.h3
  message: 'Do not start headings with a gerund.'
  excludes:
    - '**/drafts/**' # Exclude draft documents
  assertions:
    pattern:
      ignoreCase: true
      tokens:
        - '^\\w*ing.*'

recheck/config-line-length:
  severity: error
  message: 'Config docs: keep lines under %s characters.'
  appliesTo:
    - 'docs/config/**' # Only apply to config documentation
  assertions:
    line-length:
      lineLength: 100
      codeBlocks: false

recheck/ul-style-dash:
  severity: error
  message: "Use '-' for unordered list bullets."
  excludes:
    - '**/examples/**' # Allow mixed styles in examples
  assertions:
    ul-style:
      style: dash
```

## Baseline

A baseline lets a team adopt recheck on a large document set with no cleanup project first: record the findings that exist today, then fail only on new ones.

```bash
recheck --generate-baseline            # writes recheck-baseline.yaml next to your config
```

Activate it with one config line:

```yaml
baseline: ./recheck-baseline.yaml
```

The file stores one count per file per rule, errors only, sorted for stable diffs:

```yaml
version: 1
files:
  docs/index.md:
    recheck/semantic-line-breaks: 3
```

With the baseline active, `recheck`:

- **suppresses** findings whose (file, rule) count matches the baseline, and reports how many matched;
- **fails** when a count rises — the group's findings are printed with `(baseline 3, found 5)` context;
- **fails** when a count falls, because the baseline is stale — the message says to run `recheck --generate-baseline` and commit the result.
  Counts only step down, so the file equals reality at every green commit.

Warnings are never baselined; they do not affect exit codes.
Partial runs (`--rule`, `--changed-only`, a narrower path) compare only the files they scanned and the rules they ran, so they never false-alarm about what they did not see.
Line numbers are deliberately not stored: counts survive unrelated edits, and a baseline diff in review reads as "this PR pays down 4 findings."
A renamed file is a new path with no budget, so its pre-existing findings report as new until you regenerate — the baseline diff then shows the counts moving from the old path to the new one.

## Readability

`recheck --readability` reports scores per file: Flesch reading ease, Flesch-Kincaid grade, Automated Readability Index (ARI), words, and sentences, plus medians.
ARI is a grade level computed from exact character counts, with no syllable heuristic, which makes it steadier on technical vocabulary.
It is score-shaped, not rule-shaped: it never gates and always exits 0 when it ran.
To gate on a bound, use the `metric` assertion — both read the same prose and the same formulas, so they can never disagree.

```bash
recheck docs --readability
recheck docs --readability --output json
recheck docs --readability --changed-only < changed.txt   # score only listed files
```

The score reads flowing prose the way standard readability tools do: headings, code, and Markdoc tags are excluded, and every block ends a sentence.
A file with no prose reports `—` (null in JSON) rather than a fake zero.
In CI, run it twice — once on the PR head and once on the merge-base worktree — and join on file to show each changed page's score change.

## Agent skills

Agents write a growing share of markdown, and a skill makes each one a recheck user with no person in the loop.
Two skills ship in the npm package under `skills/`:

- **`recheck-lint`** — run recheck on touched markdown before committing or outputting it, fix errors, and never suppress findings to pass.
- **`recheck-config`** — write and tune `recheck.yaml`: measure the corpus, set severities from counts, prefer fixes over exceptions, and adopt a baseline for large corpora.

To use them with Claude Code, copy them into your project:

```bash
cp -r node_modules/@redocly/recheck/skills/recheck-lint .claude/skills/
cp -r node_modules/@redocly/recheck/skills/recheck-config .claude/skills/
```

Each skill is one `SKILL.md` with a trigger description and instructions, so other agent runtimes can adapt them with a rename.

## Exceptions

Rules can be configured with exceptions to skip specific files or lines:

### File Exceptions

Skip entire files using glob patterns or exact matches:

```yaml
recheck/us-spelling:
  # ... other config
  exceptions:
    files:
      - 'docs/style-guide.md' # Exact filename
      - 'docs/api/*.md' # Glob pattern
      - '**/CHANGELOG.md' # Recursive glob
```

**File matching supports:**

- **Basename matching**: `style-guide.md` matches any file with that name
- **Relative path matching**: `docs/style-guide.md` matches the specific path
- **Glob patterns**: `docs/*.md` matches all markdown files in docs directory

### Line Exceptions

Skip specific lines using fragment matching:

```yaml
recheck/no-trailing-spaces:
  # ... other config
  exceptions:
    lines:
      - 'British spellings such as' # Fragment match
      - 'Code example:' # Beginning of line
      - '// ignore-lint' # Comment-based exception
```

**Line matching behavior:**

- **Fragment matching**: If the line contains the exception text anywhere, it's skipped
- **Case-sensitive**: `"Code Example"` does not match `"code example"`
- **Multiple patterns**: Any matching pattern will skip the line

### Exception Examples

````yaml
# Skip documentation style guides for spelling rules
recheck/us-spelling:
  exceptions:
    files: ['docs/style-guide.md', '**/*style*']
    lines: ["British spellings such as 'colour'"]

# Skip auto-generated files and code blocks
recheck/no-trailing-spaces:
  exceptions:
    files: ['**/generated/**', 'CHANGELOG.md']
    lines: ['```', 'Code example:', '// formatter-ignore']
````

## Inline Directives

Beyond config-level `exceptions`, individual Markdown files can silence rules
inline with HTML comments — the same mechanism ESLint/Vale users expect.
A
directive names rules by their **short name** (`oxford-comma`) or **full
name** (`recheck/oxford-comma`) — both work.
A directive is inert inside a
fenced code block (it has to be real, parsed HTML, not just matching text).

```markdown
<!-- recheck-disable -->

Everything below this point is unchecked, for every rule.

<!-- recheck-enable -->

Checking resumes here.

<!-- recheck-disable oxford-comma us-spelling -->

Only these two rules are off from here on.

<!-- recheck-enable oxford-comma -->

us-spelling is still off; oxford-comma is back on.

<!-- recheck-disable-next-line oxford-comma -->

This one line is exempt from oxford-comma; the rest of the file isn't.

<!-- recheck-disable-file -->

Nothing in this file is linted at all, no matter where this comment sits.
```

The five forms:

| Directive                            | Effect                                                                                              |
| ------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `<!-- recheck-disable -->`           | Disables **all** rules from this line to the end of the file, or until a matching `recheck-enable`. |
| `<!-- recheck-disable rule… -->`     | Disables only the **listed** rules from this line on (same end conditions).                         |
| `<!-- recheck-enable -->`            | Re-enables all rules (or, with rule names, only the listed ones) from this line on.                 |
| `<!-- recheck-disable-next-line -->` | Disables all rules (or, with rule names, only the listed ones) for exactly the next line.           |
| `<!-- recheck-disable-file -->`      | Disables every rule for the whole file, regardless of where the comment appears.                    |

Rule naming: list one or more rules space-separated, by short name
(`oxford-comma`) or full name (`recheck/oxford-comma`) — both work on every
form that accepts names; omitting names targets every rule.
Naming a rule
that isn't configured produces a warning (`recheck-directive`, severity
`warn`) pointing at the directive's line — useful for catching a typo in
the disabled rule name — but disables nothing.

## Rule Types and Assertions

### Assertion Types

Rules are defined using `assertions` that specify their behavior:

#### Swap Assertions (`swap`)

Text replacement with configurable options.
**Fixable**: each match is replaced with its pair's value, with the matched text's own casing applied to the replacement --
an all-lowercase match inserts the replacement as configured, a Capitalized match capitalizes just the replacement's first word,
and an ALL-CAPS match (2+ letters) uppercases the whole replacement;
any other (mixed-case) casing is left as configured, since it carries no reliable intent to infer.
This matters most with `ignoreCase: true`: without it, a sentence-initial `'Behaviour'` would be fixed to literal `'behavior'`, silently lowercasing the start of the sentence -- with it, it fixes to `'Behavior'`.
(With `keysAreRegex: true`, casing is inferred from the MATCHED text, not the regex key, so this applies uniformly to regex keys too.)
When two pairs' matches overlap in the source (a compound key together with the shorter keys it contains), the longest match wins and is reported and fixed as one span.

```yaml
assertions:
  swap:
    ignoreCase: true
    wordBoundary: true
    pairs:
      color: colour
      behavior: behaviour
```

| Option         | Type      | Required | Description                                                                                                                                                                                                                             |
| -------------- | --------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pairs`        | `object`  | Yes      | Find → replace entries: each key is searched for in the segment's content and reported/fixed with its value. Keys must be non-empty strings; values must be strings.                                                                    |
| `ignoreCase`   | `boolean` | No       | Matches keys case-insensitively. Default `false`.                                                                                                                                                                                       |
| `wordBoundary` | `boolean` | No       | Wraps each key in `\b...\b` so only whole words match. Default `false`.                                                                                                                                                                 |
| `keysAreRegex` | `boolean` | No       | Keys are literal text by default; set `true` to treat each key as a regex (for example, `favou?rite` matches both spellings). An invalid regex key is ignored and matches nothing; the rule's other pairs still apply. Default `false`. |
| `includeCode`  | `boolean` | No       | Matches inside inline code spans (`` `like this` ``) are skipped by default, so a pair like `master: primary` doesn't fire inside `` `git checkout master` ``. Set `true` to scan inline code too. Default `false`.                     |

A missing or empty `pairs`, an empty-string key, a non-string replacement value, or an unknown option key under `swap` is a validation error.

The rule's `message` gets two positional `%s` substitutions, in this order: **1st = the replacement, 2nd = the matched text** — with the pair `utilize: use`, the message `'Use "%s" instead of "%s".'` renders as `'Use "use" instead of "utilize".'`

#### Pattern Assertions (`pattern`)

Regex-based pattern matching:

```yaml
assertions:
  pattern:
    ignoreCase: true
    tokens:
      - '^\\w*ing.*'
```

| Option        | Type       | Required | Description                                                                                                                                                                                                 |
| ------------- | ---------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tokens`      | `string[]` | Yes      | Regex patterns matched against each segment's content. An invalid regex is caught and silently produces zero problems rather than crashing the run.                                                         |
| `ignoreCase`  | `boolean`  | No       | Matches every token case-insensitively. Default `false`.                                                                                                                                                    |
| `includeCode` | `boolean`  | No       | Matches inside inline code spans (`` `like this` ``) are skipped by default, so a token like `master` doesn't fire inside `` `git checkout master` ``. Set `true` to scan inline code too. Default `false`. |

#### Occurrence Assertions (`occurrence`)

Vale-parity `occurrence` check: counts regex matches within each scoped segment and flags the segment when the count falls outside `[min, max]`.
`min: 1` with no `max` acts as an existence check — it flags a segment where the pattern is missing entirely.

```yaml
assertions:
  occurrence:
    pattern: '[.!?]'
    max: 3
```

| Option       | Type      | Required                    | Description                                                                                                               |
| ------------ | --------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `pattern`    | `string`  | Yes                         | Regex matched against each segment's content (whole segment, not per-line).                                               |
| `min`        | `number`  | At least one of `min`/`max` | Minimum allowed match count; fewer matches is a violation. `min: 1` with no `max` reads as "the pattern must be present". |
| `max`        | `number`  | At least one of `min`/`max` | Maximum allowed match count; more matches is a violation.                                                                 |
| `ignoreCase` | `boolean` | No                          | Matches `pattern` case-insensitively. Default `false`.                                                                    |

Omitting both `min` and `max` is a validation error — an occurrence assertion with no bound can never report anything.
An unknown option key under `occurrence` is likewise a validation error.

The rule's `message` gets two positional `%s` substitutions, in this order: **1st = the actual match count, 2nd = the bound that was violated** (`min` or `max`, whichever applied), e.g. `'Too many sentences (%s found, max %s).'` → `'Too many sentences (4 found, max 3).'`.
Not fixable (detection-only): a count-based violation has no single match position to anchor an edit to.

#### Repetition Assertions (`repetition`)

Vale-parity `repetition` check: flags an adjacent repeated word — two tokens matching `pattern`, separated only by whitespace (which may include a single hard-wrap newline), so `'the theory'` is not flagged (different words) but `'the the'` and a hard-wrapped `'the\nthe rest'` are.
**Fixable**: collapses the pair back to one occurrence, keeping the FIRST token's casing/text (so `'The the'` fixes to `'The'`, not `'the'`).

```yaml
assertions:
  repetition:
    ignoreCase: true # default
```

| Option       | Type      | Required | Description                                                                                                                                                                                                                                           |
| ------------ | --------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pattern`    | `string`  | No       | Regex used to tokenize each segment's content. Default `\w+`.                                                                                                                                                                                         |
| `ignoreCase` | `boolean` | No       | Compares adjacent tokens case-insensitively. Default **`true`** — unlike every other assertion's case-sensitive default, since `'The the'` is the overwhelmingly common typo this check exists to catch. Set `false` to require an exact-case repeat. |

An unknown option key under `repetition` is a validation error, as is a non-string `pattern` or a non-boolean `ignoreCase`; both options are optional, so an empty `repetition: {}` is valid.

The rule's `message` gets one positional `%s` substitution: the repeated word itself, e.g. `'Repeated word "%s".'` → `'Repeated word "the".'`.
Fix idempotency holds under repeated `--fix` passes: `'the the the'` converges to `'the'`.

#### Consistency Assertions (`consistency`)

Vale-parity `consistency` check: each `either` entry declares one alternative group — the key and the value are the two variants (both matched as literals with word boundaries, like `swap` keys).
Whichever variant appears **first in the file (by source order)** wins file-wide; every later occurrence of the other variant is flagged.
**Fixable**: each later occurrence is replaced with the winning variant **literally as written in `either`** — unlike `swap`, the losing match's own casing is not preserved here (with `ignoreCase: true`, a later `'Behaviour'` in a `behavior`-first document fixes to `'behavior'`).

```yaml
assertions:
  consistency:
    either:
      behavior: behaviour
      color: colour
```

| Option       | Type      | Required | Description                                                                                                                                         |
| ------------ | --------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `either`     | `object`  | Yes      | Map of variant pairs; key and value are the two alternatives of one group. Each pair gets its own independent first-seen winner. Must be non-empty. |
| `ignoreCase` | `boolean` | No       | Matches variants case-insensitively (so `'Behaviour'` counts as an occurrence of `behaviour`). Default `false`.                                     |

Omitting `either`, leaving it empty, or giving it non-string or empty-string keys or values is a validation error — a consistency assertion with no variant pairs can never report anything, and an empty-string key would otherwise reach the scan loop as a zero-width regex that never terminates.
An unknown option key under `consistency` is likewise a validation error.

Matches from overlapping scopes (e.g. `scope: [paragraph, sentence]`, where every sentence segment sits inside its paragraph segment) are deduplicated by source position before the winner is decided, so each occurrence is counted — and fixed — exactly once.

The rule's `message` gets two positional `%s` substitutions, in this order: **1st = the offending (later) match, 2nd = the first-seen winner**, e.g. `'Inconsistent spelling: "%s" conflicts with first-seen "%s".'` → `'Inconsistent spelling: "behaviour" conflicts with first-seen "behavior".'`.

#### Conditional Assertions (`conditional`)

Vale-parity `conditional` check: if `first` (a regex pattern) matches anywhere within the rule's scoped segments, `second` (a regex pattern) must exist **somewhere in the whole file** — checked against the full raw file content, not just the rule's own scope, so a `second` match sitting inside a code block still satisfies a rule scoped to `paragraph`.
When `second` is absent file-wide, every `first` match becomes its own problem, at its exact source position.
**Detection-only** (not fixable) — there is no single well-defined edit that would "introduce" `second`.

```yaml
assertions:
  conditional:
    first: '\bTODO\b'
    second: '\bDONE\b'
```

| Option       | Type      | Required | Description                                                                                   |
| ------------ | --------- | -------- | --------------------------------------------------------------------------------------------- |
| `first`      | `string`  | Yes      | Regex; if it matches anywhere in the rule's scoped segments, `second` is required. Non-empty. |
| `second`     | `string`  | Yes      | Regex; must match somewhere in the whole file content once `first` has matched. Non-empty.    |
| `ignoreCase` | `boolean` | No       | Matches both `first` and `second` case-insensitively. Default `false`.                        |

Unlike `swap`/`consistency`'s escaped-literal variants, `first` and `second` are raw user regex patterns (like `pattern`'s `tokens`).
Missing, empty, or non-string `first`/`second` is a validation error, as is an unknown option key or a non-boolean `ignoreCase` — but `first`/`second` are **not** validated as compilable regexes at config-load time; an invalid regex in either one silently produces zero problems at runtime instead (same convention as `pattern`).

Matches from overlapping scopes (e.g. `scope: [paragraph, sentence]`) are deduplicated by source position, so each occurrence of `first` is reported exactly once.

The rule's `message` gets two positional `%s` substitutions, in this order: **1st = the offending `first` match, 2nd = the `second` pattern that was never introduced**, e.g. `'"%s" appears but "%s" was never introduced.'` → `'"TODO" appears but "DONE" was never introduced.'`.

#### Capitalization Assertions (`capitalization`)

Vale-parity `capitalization` check: flags (and — for four of its `match` values — fixes) a scoped segment whose text doesn't already match the required casing.
`match` is one of `$title`, `$sentence`, `$lower`, `$upper`, or else a **custom regex** the whole segment text must satisfy.

```yaml
assertions:
  capitalization:
    match: $title
    style: chicago # optional, default 'ap' — only affects $title
    exceptions: [GitHub, iPhone]
```

| Option              | Type                | Required | Description                                                                                                                                                                                                                                                                                                            |
| ------------------- | ------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `match`             | `string`            | Yes      | `$title`, `$sentence`, `$lower`, `$upper`, or a regex the whole segment text must satisfy. Non-empty.                                                                                                                                                                                                                  |
| `style`             | `'ap' \| 'chicago'` | No       | Stopword list `$title` uses (see below). Default `'ap'`. Accepted alongside any `match`, but only has an effect on `$title` — a documented no-op elsewhere, not a validation error.                                                                                                                                    |
| `exceptions`        | `string[]`          | No       | Words (or phrases — see below) kept in their EXACT as-written casing from this list, everywhere they appear — including the first/last word — overriding every other rule. Unioned with the [built-in technical proper-noun vocabulary](#built-in-technical-proper-noun-vocabulary) unless `builtinVocabulary: false`. |
| `builtinVocabulary` | `boolean`           | No       | Default `true`. Whether [`TECHNICAL_PROPER_NOUNS`](#built-in-technical-proper-noun-vocabulary) is unioned into `exceptions`. Set `false` for a closed vocabulary of only this rule's own `exceptions`.                                                                                                                 |

An `exceptions` entry containing whitespace or a dot (e.g. `Node.js`, `VS Code`) is matched as a whole PHRASE against the segment text — case-insensitively but otherwise literally, longest-match-first when phrases overlap — and preserved verbatim, instead of being looked up per word.

Unknown option keys, a missing/empty `match`, an invalid `style`, a non-string-array `exceptions`, or a non-boolean `builtinVocabulary` are all validation errors.

**`$title`** — AP or Chicago title case, implemented in `rules/scope/title-case.ts`'s `apTitleCase`/`chicagoTitleCase`:

- The first and last word are **always** capitalized, regardless of any stopword list.
- A hyphenated compound (e.g. `well-known`) runs **each hyphen part** through the same stopword test a standalone word gets for the active style — `well-known` → `Well-Known`, but `editor-in-chief` → `Editor-in-Chief` (`in` is a stopword in both styles).
  The compound's first part always capitalizes when the compound opens the title, and its last part always capitalizes when the compound closes the title — e.g. `the new state-of-the-art` → `The New State-of-the-Art` (changed from the original simplification by product decision during execution, 2026-07-27).
- A word already in ALL-CAPS (2+ letters, e.g. an acronym like `API`) is left exactly as written.
- **AP** (default) lowercases articles (`a`, `an`, `the`), coordinating conjunctions (`and`, `but`, `or`, `nor`, `for`, `so`, `yet`), and prepositions of **3 letters or fewer** (`at`, `by`, `in`, `of`, `off`, `on`, `out`, `to`, `up`, `via`).
- **Chicago** lowercases the same articles/conjunctions, plus **every** preposition regardless of length (the short ones above, plus `about`, `above`, `across`, `after`, `against`, `along`, `among`, `around`, `before`, `behind`, `below`, `between`, `during`, `through`, `toward`, `under`, `until`, `with`, `within`, `without`) —
  e.g. Chicago lowercases `'...walking through the park'` → `'...walking through the Park'`, where AP capitalizes `Through`.

**`$sentence`** — only the first word is capitalized; every other word is lowercased unless it's an `exceptions` entry (as-written) or already ALL-CAPS (left alone).

**Word position counts a phrase exception as one word.**
A _phrase_ exception (one containing whitespace or a dot, like `Node.js` or `VS Code` — see the phrase-matching note above) is a single atomic token in the word sequence the `$`-styles case: it's emitted in its exact as-written form, and it **occupies a position**, so it never changes which word counts as first or last.
With `exceptions: [VS Code]`, the already-correctly-cased heading `## VS Code actions for teams` produces no finding under `$sentence` (`actions` is the second word, not the first), and `## a guide to Node.js` becomes `## A Guide to Node.js` under `$title`/AP (`Node.js` is the last word, so `to` is a mid-title stopword and stays lowercase).
Single-word exceptions (e.g. `GitHub`) behave as they always have — resolved by lookup rather than position.

This used to be a bug, tracked as [Redocly/redocly#25610](https://github.com/Redocly/redocly/issues/25610) and fixed since:
phrase exceptions were previously _masked out_ of the text before word position was computed, which made a leading phrase promote the next word to sentence-initial under `$sentence`
(`## VS Code actions for teams` was flagged, and under `fix: true` rewritten to `## VS Code Actions for teams`)
and made a trailing phrase promote the preceding word to last-word position under `$title` (`a guide to Node.js` → `A Guide To Node.js`).
If you had worked around it by rephrasing headings or by swapping in a custom regex `match`, neither is needed any more.
See `rules/scope/title-case.ts`'s `recaseWords` for the tokenization that replaced the masking.

**`$lower`** / **`$upper`** — the whole segment must be all-lowercase / all-uppercase respectively; no exceptions/ALL-CAPS carve-out (unconditional, matching Vale's own `$lower`/`$upper`).

**Custom regex** — the whole segment text must satisfy the pattern.
**Detection-only**: unlike the four `$`-styles, a failing regex is flagged but never auto-fixed, even though the rule itself is registered fixable.
Like `pattern`'s `tokens`, an invalid regex is caught and silently produces zero problems rather than crashing the run.

**Inline code is frozen.**
A backtick-delimited span in the segment text (e.g. a heading like ``'the `configFile` option'``) is treated like an exception: its content is never flagged or rewritten by any of the four `$`-styles, even if it would otherwise land on the first/last word.

**Fixable** for `$title`/`$sentence`/`$lower`/`$upper` only, one segment-wide edit per flagged segment.
A **multi-line** segment (e.g. a soft-wrapped paragraph) is skipped entirely under these four styles — neither a problem nor a fix — since a `Fix` can only rewrite a single line; a custom regex `match` has no such restriction and still checks (and reports) multi-line segments, since it never produces a fix regardless of segment span.

The rule's `message` gets two positional `%s` substitutions, in this order: **1st = the segment's own text (first line only), 2nd = the `match` value itself** (e.g. `'$title'`, or the literal regex source for custom-regex mode), e.g. `'"%s" should use %s capitalization.'` → `'"the great escape" should use $title capitalization.'`.

#### Metric Assertions (`metric`)

Scores the document's prose with one of six published readability formulas and flags the file once when the score falls outside `[min, max]`.

```yaml
assertions:
  metric:
    formula: flesch-reading-ease
    min: 30
```

| Option    | Type     | Required                    | Description                                                                                                           |
| --------- | -------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `formula` | `string` | Yes                         | One of `flesch-reading-ease`, `flesch-kincaid-grade`, `gunning-fog`, `smog`, `coleman-liau`, `automated-readability`. |
| `min`     | `number` | At least one of `min`/`max` | Minimum acceptable score; a lower score is a violation.                                                               |
| `max`     | `number` | At least one of `min`/`max` | Maximum acceptable score; a higher score is a violation.                                                              |

Omitting both `min` and `max`, an unrecognized `formula`, or an unknown option key are all validation errors — a metric assertion with no bound can never report anything, and an unrecognized formula would otherwise reach the scoring engine's own exhaustive-switch failure at lint time instead of at config validation.

**Always summary-scoped.**
Unlike every other assertion above, `metric` does not honor a configurable `scope:` — readability is a property of the WHOLE document's prose, not something a selector could sensibly narrow (a readability score isn't meaningful for one paragraph in isolation the way an `occurrence` count is).
Config validation forces every `metric` rule to `scope: summary`.
Omit `scope` on a `metric` rule (or write `scope: summary` explicitly); configuring any other scope prints a warning (`metric is always summary-scoped; ignoring configured scope ...`) and applies `summary` behavior anyway.
Text from overlapping segments (e.g. a list nested inside a blockquote) is deduplicated by source position, same as `consistency`/`conditional` above.

**What the score reads.**
The metric scores flowing prose the way standard readability tools do: `paragraph`, `list-item`, `blockquote`, `table.cell`, and `table.header` text counts; **headings are excluded**, and `code`, `frontmatter`, `html`, `comment`, `alt`, and `link` content is never counted.
Every block that does not end in terminal punctuation ends a sentence — an unpunctuated list item is one sentence, not a fragment fused into its neighbors.
Without that rule, a run of bullets scored as one enormous "sentence" and pushed Flesch reading ease far below zero; with it, scores line up with other readability tools within syllable-heuristic differences.

**Non-prose stripping.**
Before scoring, each segment's text also has Markdoc tag-marker spans (`{% tag attr="x" %}`, `{% /tag %}`, and the `{%- ... -%}` trim variant) and backtick-delimited inline code spans stripped out — neither is readable prose, and both otherwise skew word/syllable counts.
Prose between two block-tag markers still counts (only the marker spans themselves are removed); a paragraph consisting only of tag markers contributes nothing.
Multi-backtick delimiters (` `like this` `) are handled conservatively as a simple open-run/close-run pair match, not a full CommonMark-correct implementation.

**Detection-only** (not fixable) — there is no single edit that would "fix" a readability score.
Reports at most **one** problem per file, always at `line: 1, column: 1` (there is no single source position a whole-document score belongs to) — never divided by zero: a file with no prose at all (empty, or only code/frontmatter) is never flagged, regardless of `min`/`max`.

The rule's `message` is substituted against up to **four** values, in this order: **1st = the formula name, 2nd = the computed score, 3rd = `min` (or `-∞` if unset), 4th = `max` (or `∞` if unset)** — e.g. the internal fallback `'Readability (%s) is %s; expected between %s and %s.'` → `'Readability (flesch-reading-ease) is 42.1; expected between 60 and ∞.'`.
The `message` validation cap is per-assertion: a `metric` rule's `message` may use up to **4** `%s` placeholders (one per value above), while every other assertion stays capped at 2.
Fewer placeholders than values is fine — substitution is positional, so a 2-slot message receives the leading values (formula name, then score).

<!-- recheck-disable-next-line no-gerund-headings -->

#### Spelling Assertions (`spelling`)

Vale-parity `spelling` check (detection-only): tokenizes each scoped segment's text into words and flags any word an [nspell](https://github.com/wooorm/nspell)/Hunspell speller doesn't recognize, with up to three suggested corrections.

```yaml
assertions:
  spelling:
    vocab: [Redocly, Reunite]
    ignore: ['\bAcme\w*']
```

| Option              | Type       | Required | Description                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------- | ---------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dictionary`        | `string`   | No       | Base path (WITHOUT the `.aff`/`.dic` extension) to a custom Hunspell dictionary pair, e.g. `dictionary: dict/custom` reads `dict/custom.aff` and `dict/custom.dic`. Resolved relative to `process.cwd()` (where the CLI is invoked from) unless absolute. Omit to use the bundled default English dictionary.                                                                                                               |
| `vocab`             | `string[]` | No       | Extra known-good words, matched case-insensitively; never flagged even when the speller itself doesn't recognize them (product names, jargon, etc.). Unioned with the [built-in technical proper-noun vocabulary](#built-in-technical-proper-noun-vocabulary) unless `builtinVocabulary: false`.                                                                                                                            |
| `ignore`            | `string[]` | No       | Regex patterns; a token matching ANY of them is never flagged, e.g. `['\bAcme\w*']` to allow every inflection of a brand name. An invalid pattern is silently ignored, same convention as `pattern`'s `tokens`.                                                                                                                                                                                                             |
| `builtinVocabulary` | `boolean`  | No       | Default `true`. Whether [`TECHNICAL_PROPER_NOUNS`](#built-in-technical-proper-noun-vocabulary) is unioned into the accepted-word set alongside `vocab`. A multi-token entry (`Node.js`, `VS Code`) is split into its individual words, each accepted separately — correct for a per-word spell check, unlike `capitalization`'s whole-phrase matching. Set `false` for a closed vocabulary of only this rule's own `vocab`. |

All options are optional — an empty `spelling: {}` is valid (default dictionary, no extra vocabulary, no ignore patterns, built-in vocabulary on).
Unknown option keys, a non-string/empty-string `dictionary`, a `vocab`/`ignore` entry that isn't a non-empty string, or a non-boolean `builtinVocabulary` are all validation errors.

**Optional peer dependencies — install to enable.**
`nspell` and its default dictionary (`dictionary-en`) are **optional peer dependencies**: installing `@redocly/recheck` itself pulls in **neither**.
Enable `spelling` with:

```bash
npm i nspell dictionary-en
```

...or, if every `spelling` rule in your config sets its own `dictionary` path, you only need the speller itself (the bundled dictionary is never touched):

```bash
npm i nspell
```

If a config enables `spelling` without the required peer(s) installed, `recheck --validate-config` fails with an actionable error naming the exact command above — never a bare `Cannot find module 'nspell'` surfacing for the first time at lint time.

**Dictionaries load lazily.**
Neither `nspell` nor `dictionary-en` is imported unless some rule in your config actually has a `spelling` assertion — a config without one never touches either package, at either `validate` or lint time.
The loaded speller (including the ~500KB parsed dictionary) is cached per dictionary source for the process's lifetime, so every file/rule sharing the same `dictionary` (or the shared default) reuses one instance rather than reloading it per call.

**Word tokenization.**
Words are matched with `/\p{L}+(?:['’]\p{L}+)?/gu` — Unicode letter runs, with an optional apostrophe-joined suffix so contractions (`don't`, `it's`) tokenize as one word.
A token is skipped (never checked) when it's in `vocab` (case-insensitively), matches any `ignore` pattern, is ALL-CAPS (2+ letters, e.g. an acronym) — matching the same ALL-CAPS carve-out `$title`/`$sentence` capitalization use — or is digit-adjacent (see below).
Because `\p{L}` can never match a digit, a token touching one is never captured WHOLE by the tokenizer in the first place: a digit-adjacent identifier like `config2` still splits into a letter-only fragment (`config`) as its own regex match.
Rather than checking that fragment like any other word, a digit-adjacency guard looks at the character immediately before and after each match and skips it when either neighbor is a digit — so common digit-bearing identifiers (`sha256` → `sha`, `utf8` → `utf`, `oauth2` → `oauth`, `es6` → `es`, `log4j` → both `log` and `j`, `2fast` → `fast`) are no longer flagged as false-positive misspellings.
This mitigates, but doesn't eliminate, every false positive from the tokenizer's inability to capture digits at all — a token entirely surrounded by non-digit characters is still checked normally, so a genuine misspelling elsewhere in the same sentence is still flagged.

**Code is never spell-checked, by construction of scope segmentation — not something this assertion special-cases.**
A fenced or indented code block is its own `scope: 'code'` segment, entirely distinct from `paragraph`/`heading`/etc.; scoping `spelling` to prose (the common case, e.g. `scope: paragraph` or an array of prose scopes) means `ctx.segments` never contains one.
A backtick-delimited **inline** code span, though, remains embedded as raw text inside a prose segment's own content (verified directly against the extractor) — those spans are masked out before tokenizing, the same length-preserving technique `capitalization`'s backtick-span freezing uses, so positions of any remaining flagged word stay exact.
Scoping `spelling` to `all`/`raw` (or leaving `scope` at its default) checks the whole raw file, literal code included — same default-scope behavior every other native assertion (`swap`, `pattern`, ...) has.

**Detection-only** — no `fix`.
The rule's `message` gets two positional `%s` substitutions, in this order: **1st = the unrecognized word, 2nd = a suggestion suffix** — either `''` (zero suggestions) or `' — did you mean: a, b, c?'` (one to three, comma-joined) — e.g. the internal fallback `'Unknown word "%s"%s'` → `'Unknown word "wrold" — did you mean: wold, world?'`.

#### Built-in technical proper-noun vocabulary

`capitalization` and `spelling` both ship a built-in list of common technical/product proper nouns — `TECHNICAL_PROPER_NOUNS`, exported from `@redocly/recheck`'s public API (`import { TECHNICAL_PROPER_NOUNS } from '@redocly/recheck'`) so you can read or extend it yourself.
It exists so a config that turns on sentence-case headings or spelling doesn't immediately need to hand-list the same 15+ mixed-case technology names every project already has to deal with (`OpenAPI`, `npm`, `Node.js`, `VS Code`, ...).

**On by default**, per rule:

- `capitalization` unions it into `exceptions` (so a listed name keeps its as-written casing under every `$`-style, including `$sentence`).
- `spelling` unions it into `vocab` (so those words are never reported as misspellings), splitting any multi-token entry into its individual words first — a per-word spell check has no way to accept a whole phrase atomically the way `capitalization`'s phrase matching does.
- Either union is opted out of independently with that rule's own `builtinVocabulary: false`, restoring strict pre-built-in behavior (a closed vocabulary of only what you list yourself).
- Your own `exceptions`/`vocab` on the same rule **compose** with the built-ins rather than replacing them — unlike a preset-shipped list on the same rule key, which a same-key override _would_ replace entirely (see [`extends` presets](#extends-presets) above).
  This is exactly how [`recheck/prose`](#extends-presets)'s `capitalization` rule gets its protection for common technical nouns without shipping any `exceptions` of its own.

**Multi-token entries work.**
An entry containing a dot or whitespace (`Node.js`, `VS Code`, `Visual Studio Code`, `GitHub Actions`, `Google Cloud`, `Azure DevOps`) is matched by `capitalization` as a whole phrase against the segment text (longest-match-first, case-insensitive but otherwise literal) and preserved verbatim — not looked up per word, which is what a single-token entry like `GitHub` still gets.

**Inclusion bar** (why an entry is — or isn't — in the list, and the bar to clear before proposing one): an entry qualifies if it's an unambiguous technology, product, or company name whose exception listing wouldn't _weaken_ capitalization/spelling checks — concretely, its lowercase form must not be a legitimate English word in its own right.
That covers ordinary Title-Case brand names (`Android`, `Kubernetes`, `Redocly`) just as much as entries with an internal capital (`OpenAPI`, `GraphQL`), a dot (`Node.js`), or forced lowercase (`npm`) — `$sentence` lowercases every non-first word regardless of how "ordinary" its casing looks, so plain Title-Case names need protection too.
Excluded, deliberately:

- **Pure ALL-CAPS acronyms** (`JWT`, `YAML`) — already handled structurally by the ALL-CAPS carve-out both `capitalization` and `spelling` apply, so listing them adds maintenance for no behavior change.
  Note this is narrower than "looks like an acronym": `OAuth` and `AsyncAPI` are mixed-case, not pure ALL-CAPS, and are in the list.
- **Terms with legitimate lowercase prose usage** — generic English (`cloud`, `apps`),
  words that are ALSO ordinary English words even though they're Redocly product names too (`Realm`, `Replay`, `Respect` — listing them would force-capitalize ordinary usage like "we respect your privacy"; `Node` — the common technical noun, superseded by the `Node.js` phrase entry for the platform specifically),
  and — caught by a later audit, not the original pass — ordinary brand-shaped words with a real dictionary meaning (`Chrome`, `Markdown`, `Postman`, `Prettier`, `Safari`, `Swagger`, `Windows`; see `src/data/proper-nouns.ts`'s header for each one's disqualifying lowercase usage).
  A few real dictionary words (`Android`, `Docker`, `TypeScript`) were judged rare enough in ordinary lowercase usage to keep anyway — a documented, deliberate risk-acceptance, not an oversight.
  List your own such names in your rule's own `exceptions`/`vocab`, which compose with this list as described above.

Two automated tests in `src/data/__tests__/proper-nouns.test.ts` enforce this:
one checks every entry's shape against the bar above — no pure ALL-CAPS, and, mechanically, no single-token entry whose lowercase form the REAL spelling dictionary (`dictionary-en`/`nspell`, the same pair `spelling` loads at runtime) accepts as a legitimate English word, unless it's named in an explicit accepted-risk allowlist —
plus alphabetization and no duplicates.
A round-trip guard separately drives every entry through the real `capitalization` and `spelling` rules and fails the suite if any entry can't actually be protected — the list can't silently regress into decoration.

#### Length Assertions (`length`)

Recheck-original, detection-only check: measures each scoped segment's size — in characters, words, or sentences — and flags a segment whose measurement falls outside `[min, max]`.
Unlike `metric` (always whole-document), `length` honors whatever `scope` the rule configures — e.g. `scope: alt` to cap image alt text, or `scope: sentence` to cap sentence length in words.
[`recheck/google`](#extends-presets) ships this for the guide's stated "fewer than 26 words per sentence" limit (`google/sentence-length`); Microsoft's 150-character alt-text cap is the other published example of this shape.

```yaml
assertions:
  length:
    unit: characters
    max: 150
```

| Option | Type                                     | Required                    | Description                                                                                                                                                                                                                                                                        |
| ------ | ---------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `unit` | `'characters' \| 'words' \| 'sentences'` | Yes                         | What `min`/`max` count: raw character length, whitespace-delimited words (the same tokenizer `metric` uses for its own word counts — see `metrics/statistics.ts`'s `tokenizeWords`), or sentences via the shared `splitSentences` sentence-boundary logic (`scopes/sentences.ts`). |
| `min`  | `number`                                 | At least one of `min`/`max` | Minimum allowed size; a smaller segment is a violation.                                                                                                                                                                                                                            |
| `max`  | `number`                                 | At least one of `min`/`max` | Maximum allowed size; a larger segment is a violation.                                                                                                                                                                                                                             |

Omitting both `min` and `max`, a missing/unrecognized `unit`, or an unknown option key are all validation errors — same reasoning as `occurrence`/`metric` above.
An inverted range (`min` > `max`) is also an error.

**Detection-only** (not fixable) — there is no single edit that would resize a segment to fit.
Reports at most one problem per flagged segment, at the segment's own `startLine`/`startColumn`.

The rule's `message` gets three positional `%s` substitutions, in this order: **1st = the segment's measured size, 2nd = the unit name, 3rd = the bound that was violated** (`min` or `max`, whichever applied), e.g. the internal fallback `'Segment is %s %s; at most %s allowed'` → `'Segment is 151 characters; at most 150 allowed'`.
The message validation cap for `length` is **3** placeholders (one per value above), same reasoning as `metric`'s 4-cap.

#### Built-in Prose Assertions

Beyond `swap`, `pattern`, `occurrence`, `repetition`, `consistency`, `conditional`, `capitalization`, `metric`, `spelling`, and `length` above, Recheck ships a small set of native prose/format checks:

- `semantic-line-breaks` - Semantic line break validation ✅ **Fixable**
- `max-image-size` - Oversized image detection

Three of the assertions above (`repetition`, `consistency`, `capitalization`) are bundled, pre-configured, in the [`recheck/prose`](#extends-presets) preset,
and `capitalization`/`length` are also used by [`recheck/google`](#extends-presets) (sentence-case headings and list items, and a sentence-length cap);
the remaining four (`occurrence`, `conditional`, `metric`, `spelling`) are documented [opt-ins](#opt-in-prose-assertions) with copy-paste snippets, not shipped in any preset by default.

### Recheck-original structural rules

Seven rules have no markdownlint counterpart, so they sit outside the 53-rule parity set
(and outside the parity comparison).
All seven are **detection-only** (`fix: false`).
The
canonical list is `RECHECK_ORIGINAL_TOKEN_RULE_NAMES` in `src/rules/token/index.ts`.

The table below covers five of them.
The other two — `markdoc-unknown-tag` and
`markdoc-attributes` — need a tag schema to check anything, so they are documented with
the [`recheck/markdoc`](#extends-presets) preset instead.

| Rule                             | Flags                                                                                                                                         | Why                                                                                                                                                                                                                                                                             |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `no-empty-headings`              | A heading whose text content is empty (a bare `#`, or markup that renders to nothing such as `## <span></span>`)                              | An empty heading still lands in the document outline and in screen-reader heading navigation. Inline code counts as content, so `` # `config.yaml` `` is fine.                                                                                                                  |
| `no-duplicate-link-destinations` | The second and later links to one destination when the link **text** differs from the first occurrence's                                      | Screen-reader users listing a page's links hear one target described inconsistently; the texts also drift apart over time. Repeating the _same_ text for the same destination is ordinary prose and is not flagged. Resolves reference links through their definition.          |
| `list-length`                    | A list (ordered or unordered) with fewer than `min` items (default 2) or more than `max` items (no default — unbounded unless set)            | A single-item list usually reads better as a plain sentence, and a very long list asks readers to hold too many parallel items in mind. Every list is evaluated independently, including nested sublists — a short sublist is flagged even when its parent list is long enough. |
| `markdoc-syntax`                 | A grammar-level Markdoc tag error — a malformed span, an unquoted "bareword" attribute/primary value, or a close tag carrying attributes      | These are invalid under real Markdoc's own grammar regardless of any tag schema, so the rule fires on custom/unknown tags and under `schema: false` alike. See the [`recheck/markdoc`](#extends-presets) preset bullet below for the full behavior and a config example.        |
| `markdoc-pairing`                | An unclosed, orphaned, or interleaved (crossed) Markdoc tag pair, or a schema-declared self-closing tag written with a close it must not have | Same grammar-level scope as `markdoc-syntax` — see the [`recheck/markdoc`](#extends-presets) preset bullet below.                                                                                                                                                               |

The first three rules are **opt-in — not shipped in any preset**; configure them
individually as shown below.

`markdoc-syntax` and `markdoc-pairing` work the other way around: they ship only inside
the [`recheck/markdoc`](#extends-presets) preset, and both need `markdoc: true` (or the
object form) to ever see a Markdoc tag token.
Naming either rule key on its own, without
the flag, validates but can never report anything — and you get no warning about it,
because the stale-config warning fires on `extends` containing `"recheck/markdoc"`
(`warnStaleMarkdocPreset` in `config/validate.ts`), not on individual rule keys.
The
preset bullet below covers both rules' full behavior with the flag on, plus a config
example.

```yaml
recheck/empty-headings:
  severity: error
  message: 'Headings should have text content.'
  assertions:
    no-empty-headings: {}

recheck/link-text-consistency:
  severity: warn
  message: 'Link destination "%s" is already linked by different text.'
  assertions:
    no-duplicate-link-destinations: {}

recheck/list-length:
  severity: warn
  message: 'List has %s item(s).'
  assertions:
    list-length: { min: 2, max: 10 }
```

For markdown structure/format rules (headings, lists, links, tables, whitespace, and 49 more), see [Markdownlint parity](#markdownlint-parity) below — `no-trailing-spaces`, `no-hard-tabs`, `line-length`, `ul-style` (bullet style), `no-duplicate-heading`, and `link-fragments` are all part of that 53-rule set, not this native list.
(`max-line-length`, `bullet-style`, `no-duplicate-headings`, and `no-broken-fragment-links` were pre-parity native ids for those same rules; they were removed rather than kept as aliases — see [Migrate from markdownlint](#migrate-from-markdownlint).)

### Enhanced Scope Support

The `scope` field supports a string, an array (OR'd together), and a `~negation` / `&`-conjunction
selector syntax:

```yaml
scope: all              # Apply to all content (default)
scope: raw              # Apply to raw file content, bypassing scope segmentation
scope: summary          # Apply to the document's prose: paragraph, heading, list-item, blockquote, and table-cell text (alias: default)
scope: sentence         # Apply to sentences only
scope: paragraph        # Apply to paragraphs only
scope: heading          # Apply to all headings
scope: code             # Apply to code blocks only
scope: list-item        # Apply to list item text
scope: blockquote       # Apply to blockquote text
scope: table.header     # Apply to table header cells
scope: table.cell       # Apply to table body cells
scope: markdoc.tag      # Apply to Markdoc tag spans (`{% ... %}`), requires markdoc: true
scope: frontmatter      # Apply to YAML frontmatter
scope: html             # Apply to raw HTML blocks
scope: comment          # Apply to HTML comments
scope: alt              # Apply to image alt text
scope: link             # Apply to link text
scope:                  # Apply to specific heading levels
  - heading.h1
  - heading.h2
  - heading.h3
scope:                  # Selector syntax: '~' negates, '&' conjoins
  - "~blockquote & ~heading"
```

### Markdoc-aware linting (`markdoc: true`)

Opt-in — off by default, since Liquid/Jinja templates use the same `{% %}` delimiters and would otherwise get mistokenized as Markdoc:

```yaml
markdoc: true # shorthand for `{ schema: 'realm' }`
```

Writing _about_ Markdoc syntax rather than using it (docs like this one, a tutorial, a changelog entry)?
Wrap the literal `{% ... %}` in a code span — `` `{% partial /%}` `` — instead of leaving it bare in prose.
Code spans never tokenize as Markdoc tags whether the flag is on or off, so that's the escape hatch.

#### Object form: choosing or extending the tag schema

`markdoc: true` is shorthand for the common case.
The object form adds two things the
boolean can't express: turning the schema-aware checks off while keeping tag tokenization,
and layering a project's own custom tags over the built-in schema.

```yaml
markdoc:
  schema: realm # required -- 'realm' (the built-in schema below) or `false`; there is no default if this key is omitted
  extend: # optional: your own tags, merged over the base schema
    tags:
      myCustomTag:
        selfClosing: true
        attributes:
          level:
            type: string
            enum: [info, warning, danger]
            required: true
```

- **`schema: realm`** — the same built-in schema `markdoc: true` uses: `@markdoc/markdoc`'s
  own built-in tags composed with `@redocly/theme`'s tag definitions.
  It's generated from a
  theme build rather than hand-written, and a test fails if it drifts out of sync (see
  [CONTRIBUTING.md](CONTRIBUTING.md) for the regeneration command).
  This is what most
  projects want, and what the four [`recheck/markdoc`](#extends-presets) rules validate
  against by default.
- **`schema: false`** — tokenization and tag **pairing** still run, so `markdoc.tag` scope,
  prose-scope exclusion, fix protection, and `markdoc-syntax`/`markdoc-pairing`'s
  grammar-level checks all still work.
  Only the two schema-dependent rules
  (`markdoc-unknown-tag`, `markdoc-attributes`) go inert, since there's no schema left for
  "unknown tag" or "missing required attribute" to mean anything against.
  Use this if you
  write Markdoc tags but don't have (or don't want) a schema to validate them against.
- **`extend.tags`** — merges your own tag definitions over the base schema.
  On a name
  collision the merge is a **whole-tag replace**, matching how Markdoc's own config
  composition works, not a per-attribute deep merge.
  Declare your project's custom tags
  here (for example, a docs site's own `@theme/markdoc/schema.ts` overrides) so
  `markdoc-unknown-tag` and `markdoc-attributes` validate against your real tag surface
  instead of flagging every custom tag as unknown.
  Under `schema: false` there is no base
  to merge over, so `extend` does nothing.
- **`extend.tagsFile`** — the same tag-definition surface as `extend.tags`, but sourced from
  a separate YAML file instead of written inline into `recheck.yaml`.
  This is the shape
  [`recheck --generate-markdoc-schema`](#generate-a-tagsfile-recheck---generate-markdoc-schema) below generates,
  so a project with tags defined in TypeScript (a `@theme/markdoc/schema.ts` module, say)
  never hand-transcribes them into YAML.

  ```yaml
  markdoc:
    schema: realm
    extend:
      tagsFile: ./recheck-markdoc-tags.yaml
  ```

  - **Resolution**: the path is resolved relative to the directory containing the
    `recheck.yaml`/`recheck.yml` that names it — never the process's current working
    directory — so `tagsFile: ./tags.yaml` always reads the file next to that config,
    wherever `recheck` is invoked from.
  - **Precedence**: tags merge in the order built-in schema → `tagsFile` → inline
    `extend.tags`, each layer a whole-tag replace on a name collision (same rule as
    `extend.tags` above).
    `tags` and `tagsFile` can both be set on the same `extend` block;
    `extend` with neither key is rejected by config validation as a likely no-op.
  - **Errors are fatal to the whole run, not a silent markdoc downgrade.**
    A `tagsFile` that
    doesn't exist, isn't valid YAML, isn't a YAML map, or contains a tag entry with an
    invalid shape all fail `recheck`/`recheck --validate-config` outright
    (`Configuration validation failed!`, the same failure every other structurally-invalid
    config produces) — markdoc checking is never quietly switched off while the rest of the
    config keeps running.

Turning `markdoc` on (either form) changes how every prose rule sees a Markdoc tag, not just `markdoc.tag` (above):

- **Prose scopes exclude the tag itself.**
  `paragraph`, `heading`, `list-item`, `blockquote`, and `table.header`/`table.cell` all blank a tag's own `{% ... %}` span out of their content before any rule runs — a `swap`/`pattern`/`capitalization` match can't fire on the tag's syntax, and a `length`/`metric` count doesn't include it.
  The blanking is position-preserving (same-width spaces, never a deletion), so real text on either side of a tag keeps its exact line and column.
- **A segment with no prose left isn't emitted at all.**
  A heading or table cell whose entire text IS a tag (`# {% #anchor %}`) produces no `heading.h1`/`table.cell` segment — there's nothing for a heading or cell rule to check, so none fires on it.
- **`--fix` never rewrites a Markdoc tag's bytes.**
  Every proposed fix is checked against the document's tag spans before it's applied:
  one that doesn't touch a tag goes through untouched, one that fully covers a tag with a same-length replacement gets the tag spliced back in,
  and anything that would change a tag's length or split it in half is withheld instead — a withheld fix is reported (`skippedFixes` in the [Library API](#library-api)), not silently swallowed.
- **Two CommonMark constructs Markdoc doesn't have stop being recognized.**
  Markdoc's own tokenizer disables indented code blocks and setext headings (the `Title\n===\n` underline form) unconditionally, which is how Realm renders, so `markdoc: true` disables them too — and only while the flag is on:
  - A 4+-space-indented block that would otherwise be an indented code block parses as ordinary content instead: a paragraph, list, or fence, whichever the un-indented text would have produced.
    This shows up most with a block-positioned tag followed immediately by more indented lines, and with genuinely indented example text.
    Realm renders both as prose, so matching that is the intent.
  - A text line immediately followed by a `---`/`===` line, with no blank line between, no longer forms a heading.
    This also fixes a common false positive: a tag on its own line (`{% table %}`, say) directly followed by a `---` line is ordinary Markdoc table-row syntax, but without the flag it reads as a setext heading whose text is the tag itself.
    With the flag on, the tag is its own token and can't merge into a paragraph that `---` would complete.
  - Practical effect: on documents using either construct, expect `heading-style`, `blanks-around-headings`, `capitalization`, and `code-block-style` findings to shift when you first turn the flag on.
    They are moving to match how Markdoc actually renders, not regressing.

### Generate a tagsFile: `recheck --generate-markdoc-schema`

Projects that define their own Markdoc tags in TypeScript — a `@theme/markdoc/schema.ts`
module exporting a `tags` map, the shape both `docs/realm` and `docs/intranet` use in this
monorepo — can generate an `extend.tagsFile` YAML file from it instead of hand-transcribing
each tag's schema:

```bash
recheck --generate-markdoc-schema --from path/to/schema.ts --out recheck-markdoc-tags.yaml
```

- **`--from <path>`** (repeatable) — a project schema module to extract tags from, resolved
  relative to the current working directory.
  The module must export `tags` (named or on a
  `default` object) mapping tag name to a Markdoc tag config; only the statically-checkable
  facets (`selfClosing`, and each attribute's `type`/`required`/`default`/`enum`) are
  extracted — anything richer (a custom attribute class, a `validate()` function) is written
  out as `dynamic: true`, the same reduction the built-in `realm` schema goes through.
  Pass
  `--from` more than once to merge several modules; an identical tag definition repeated
  across modules is fine, but two modules disagreeing about the same tag's shape fails the
  command rather than letting flag order silently pick one.
- **`--out <path>`** — where to write the generated YAML, resolved relative to the current
  working directory.
  The file opens with a generated-file header naming its source module(s)
  and the exact command to regenerate it.
- **`--check`** — verifies the output file matches what a fresh generation would produce,
  without writing it: exits `0` and prints `<path> is up to date.` when it matches, exits `1`
  and prints a one-line diagnosis (file missing, or stale) otherwise.
  This is what a CI drift
  check should call — see this repo's own wiring below.

**TypeScript sources need a loader.**
`recheck --generate-markdoc-schema` dynamic-`import()`s each
`--from` module directly; running the command under plain `node` against a `.ts` module
fails with an actionable one-line error naming the fix, rather than a raw stack trace:

```text
could not import "path/to/schema.ts" — TypeScript sources need a loader, e.g.: pnpm exec tsx
node_modules/.bin/recheck --generate-markdoc-schema … (Cannot find module '<a module your schema
imports>' imported from '<path to your schema.ts>')
```

(wrapped above for line length; the real message is one line.
The parenthetical is Node's
own error and its shape varies: for a schema whose extensionless internal imports plain
`node` cannot resolve — the common case — the "imported from" path is your schema file
itself; for a `--from` path that doesn't exist at all it is recheck's own command module.)

Run it through `tsx` instead (directly, or via a package script that already wraps it, like
this repo's `recheck:markdoc-tags` below) — a plain `.js` schema module needs no loader and
works under either.

**Experimental, pending a canonical manifest.**
This command is an interim bridge, not a
long-term source of truth: [issue #25666](https://github.com/Redocly/redocly/issues/25666)
tracks Realm itself emitting one canonical, statics-only Markdoc tag/schema manifest, which
would let this generator (and its drift check) retire in favor of reading that manifest
directly.
Until then, `recheck --generate-markdoc-schema` is the supported way to keep a project's
`tagsFile` in sync with its real tag schema modules.

#### Worked example: this repo's own setup

This monorepo's root `recheck.yaml` uses `extend.tagsFile` to pull in the custom tags from
both `docs/realm` and `docs/intranet`'s own `@theme/markdoc/schema.ts` modules:

```yaml
markdoc:
  schema: realm
  extend:
    tagsFile: ./recheck-markdoc-tags.yaml
```

The committed `recheck-markdoc-tags.yaml` is generated, not hand-written — its header names
the exact regenerate command:

```yaml
# Generated file — do not hand-edit.
# Source module(s): ../../docs/realm/@theme/markdoc/schema.ts, ../../docs/intranet/@theme/markdoc/schema.ts
# Regenerate: recheck --generate-markdoc-schema --from ../../docs/realm/@theme/markdoc/schema.ts --from ../../docs/intranet/@theme/markdoc/schema.ts --out ../../recheck-markdoc-tags.yaml
```

The root `package.json` wraps that same invocation in one script, run from
`packages/recheck` via `tsx` (the schema modules are TypeScript source, see above):

```bash
pnpm run recheck:markdoc-tags            # regenerate recheck-markdoc-tags.yaml
pnpm run recheck:markdoc-tags --check    # verify it's current; exits 1 on drift
```

**Do not add `--` before `--check`.**
`pnpm run recheck:markdoc-tags -- --check` looks
equivalent but isn't: the script itself already ends in `pnpm --filter @redocly/recheck exec
tsx dist/cli.js --generate-markdoc-schema …`, and pnpm's own `--` forwarding through that nested `exec`
makes yargs read `--check` as a positional argument instead of the `--check` flag — the
command then silently regenerates the file and always exits `0`, defeating the whole point
of a drift check.
Always call it as `pnpm run recheck:markdoc-tags --check`, with no extra
`--`.

CI runs exactly that check on every PR, as its own step in
`.github/workflows/recheck.yml` (after the package is built):

```yaml
- name: Markdoc tags file is current
  run: pnpm run recheck:markdoc-tags --check
```

If it fails, regenerate locally with `pnpm run recheck:markdoc-tags` and commit the result.

### Rule Severity Levels

Rules can be configured with different severity levels:

- **`off`**: Disable the rule completely
- **`info`**: Informational messages (exit code 0)
- **`warn`**: Warning messages (exit code 0)
- **`error`**: Error messages (exit code 1)

### Auto-Fix Safety

Fixability is declared by each assertion, not by config — a rule can be automatically corrected if and only if its assertion implements a `fix()`.
The `autoFixable` config key was removed — rules declare fixability; use `fix: false` to opt out.
A config that still sets `autoFixable` now fails validation with an unknown-property error.
To opt a rule out of auto-fixing, set `fix: false` on it instead.

The `enabled` config key was likewise removed — it was schema-legal but never actually consulted by the engine (use `severity: off` to disable a rule).
A config that still sets `enabled` now fails validation with an unknown-property error.

- ✅ **Fixable native assertions**: `swap`, `semantic-line-breaks`, `repetition`, `consistency`, `capitalization` (except its custom-regex `match` mode, which is always detection-only)
- ❌ **Not fixable native assertions**: `pattern`, `max-image-size`, `occurrence`, `conditional`, `metric`, `spelling`
- Of the 53 markdownlint-parity rules, 33 are fixable — see the [rule table](#markdownlint-parity) for the full per-rule breakdown (includes `no-trailing-spaces`, `no-hard-tabs`, `ul-style`, and more).

## Markdownlint parity

Recheck ports all 53 of [markdownlint](https://github.com/DavidAnson/markdownlint)'s built-in rules (MD001-MD060, minus retired ids) as native `assertions`, verified against upstream by a differential parity harness (see [Parity with markdownlint](#parity-with-markdownlint) below).
Enable the full set with one line:

```yaml
extends: [recheck/markdown]
```

Each rule is available as its own `recheck/<name>` assertion id, so you can also enable a subset directly:

```yaml
recheck/heading-increment:
  severity: error
  message: 'Heading levels should only increment by one level at a time.'
  assertions:
    heading-increment: {}
```

| Rule name                          | MD id | Fixable |
| ---------------------------------- | ----- | ------- |
| `heading-increment`                | MD001 | No      |
| `heading-style`                    | MD003 | No      |
| `ul-style`                         | MD004 | Yes     |
| `list-indent`                      | MD005 | Yes     |
| `ul-indent`                        | MD007 | Yes     |
| `no-trailing-spaces`               | MD009 | Yes     |
| `no-hard-tabs`                     | MD010 | Yes     |
| `no-reversed-links`                | MD011 | Yes     |
| `no-multiple-blanks`               | MD012 | Yes     |
| `line-length`                      | MD013 | No      |
| `commands-show-output`             | MD014 | Yes     |
| `no-missing-space-atx`             | MD018 | Yes     |
| `no-multiple-space-atx`            | MD019 | Yes     |
| `no-missing-space-closed-atx`      | MD020 | Yes     |
| `no-multiple-space-closed-atx`     | MD021 | Yes     |
| `blanks-around-headings`           | MD022 | Yes     |
| `heading-start-left`               | MD023 | Yes     |
| `no-duplicate-heading`             | MD024 | No      |
| `single-h1`                        | MD025 | No      |
| `no-trailing-punctuation`          | MD026 | Yes     |
| `no-multiple-space-blockquote`     | MD027 | Yes     |
| `no-blanks-blockquote`             | MD028 | No      |
| `ol-prefix`                        | MD029 | Yes     |
| `list-marker-space`                | MD030 | Yes     |
| `blanks-around-fences`             | MD031 | Yes     |
| `blanks-around-lists`              | MD032 | Yes     |
| `no-inline-html`                   | MD033 | No      |
| `no-bare-urls`                     | MD034 | Yes     |
| `hr-style`                         | MD035 | No      |
| `no-emphasis-as-heading`           | MD036 | No      |
| `no-space-in-emphasis`             | MD037 | Yes     |
| `no-space-in-code`                 | MD038 | Yes     |
| `no-space-in-links`                | MD039 | Yes     |
| `fenced-code-language`             | MD040 | No      |
| `first-line-h1`                    | MD041 | No      |
| `no-empty-links`                   | MD042 | No      |
| `required-headings`                | MD043 | No      |
| `proper-names`                     | MD044 | Yes     |
| `no-alt-text`                      | MD045 | No      |
| `code-block-style`                 | MD046 | No      |
| `single-trailing-newline`          | MD047 | Yes     |
| `code-fence-style`                 | MD048 | No      |
| `emphasis-style`                   | MD049 | Yes     |
| `strong-style`                     | MD050 | Yes     |
| `link-fragments`                   | MD051 | Yes     |
| `reference-links-images`           | MD052 | No      |
| `link-image-reference-definitions` | MD053 | Yes     |
| `link-image-style`                 | MD054 | Yes     |
| `table-pipe-style`                 | MD055 | No      |
| `table-column-count`               | MD056 | No      |
| `blanks-around-tables`             | MD058 | Yes     |
| `descriptive-link-text`            | MD059 | No      |
| `table-column-style`               | MD060 | Yes     |

_(53 rules, 33 fixable.
Generated from the built rule registry — `dist/rules/token/index.js`'s `allTokenRules`, cross-referenced against `benchmarks/parity/rule-map.mjs` for MD ids.)_

### `extends` presets

Recheck ships nine built-in presets, referenced by id under `extends:`.
Presets are applied in listed order, then your own rule keys are merged on top — **your config always wins**: a rule key you define overrides the same key from a preset, and per-assertion options you set override just that assertion's preset options (other preset options for the same rule are preserved).

There is one exception.
A rule may attach a milder severity to some of its own reports, and your config can't escalate those: `recheck/markdoc-attributes` reports unknown attributes at `warn` no matter what severity you give the rule (see the `recheck/markdoc` bullet below).
`severity: 'off'` still works as expected — it disables the rule entirely, so no reports of any severity.

- **`recheck/markdown`** — the full 53-rule set from the table above, all at `severity: error` with upstream-faithful default options.
  Equivalent to markdownlint's `{ default: true }`.
- **`recheck/markdown-relaxed`** — mirrors markdownlint's own `style/relaxed.json`: the same 53 rules, with `no-trailing-spaces`, `no-hard-tabs`, `no-multiple-blanks`, `no-multiple-space-blockquote`, `no-blanks-blockquote`, `line-length`, `ul-indent`, `no-inline-html`, `no-bare-urls`, `fenced-code-language`, and `first-line-h1` turned off.
- **`recheck/minimal`** — a small, high-signal set: `no-trailing-spaces`, `no-hard-tabs`, `single-trailing-newline`, `no-reversed-links`, `no-empty-links`.
- **`recheck/prose`** — Recheck's Vale-parity starter set, all at `severity: warn`: `repetition` (default options),
  `consistency` (one US spelling enforced file-wide for `behavior`/`color`/`license`/`organize` vs. their British spellings, matched with `ignoreCase: true` so a capitalized, sentence-initial variant like `Colour` still counts),
  and `capitalization` (`$sentence`, `scope: heading` only, `fix: false`, no preset-level `exceptions` — see below).
  All three are scoped to prose segments — `repetition` and `consistency` to `summary` (the document's prose: paragraph, heading, list-item, blockquote, and table-cell text), `capitalization` to headings — so the preset never flags (and `--fix` never rewrites) code samples or frontmatter.
  `extends: [recheck/markdown, recheck/prose]` is the one-liner that replaces a markdownlint + Vale combo.
  See [Opt-in prose assertions](#opt-in-prose-assertions) below for three more prose assertions that exist but are deliberately **not** in this preset.
- **`recheck/markdoc`** — four Recheck-original rules that check Markdoc tag syntax itself (`{% tag attr="value" %}`) rather than prose or markdownlint parity.
  All four are `fix: false`.
  - `recheck/markdoc-syntax` (`error`) — malformed spans, unquoted "bareword" values, and close tags carrying attributes.
  - `recheck/markdoc-pairing` (`error`) — unclosed, orphaned, or crossed tag pairs, and a self-closing tag written without a slash or given a close tag it shouldn't have.
  - `recheck/markdoc-unknown-tag` (`warn`, because custom tags are common) — a tag name the schema doesn't declare.
  - `recheck/markdoc-attributes` (mixed) — a missing required attribute, an enum or type violation, and a duplicate attribute report at `error`; an unknown attribute name, whether named or a stray positional value, always reports at `warn`.
    That `warn` is set per report by the rule itself, so it wins over the rule's configured severity: setting the rule to `severity: error` does not escalate those reports.
    Only `severity: 'off'` removes them, by disabling the rule.

  **These rules only fire when Markdoc tokenization is also on.**
  Set `markdoc: true` (or the object form, see below) alongside `extends: [recheck/markdoc]`.
  Extending the preset without the flag validates, but prints a console warning that the four rules can never report.
  The flag stays an explicit opt-in because Liquid and Jinja templates use the same `{% %}` delimiters for unrelated syntax, so Recheck never assumes it.

- **`recheck/google`** — Google's developer documentation style guide (https://developers.google.com/style), CC BY 4.0, synced 2026-07-29.
  99 rules covering heading/list/table/link structure, sentence-case headings, sentence length, voice and contractions, plain language, product naming, compound word forms, and inclusive/precise-language terminology —
  all derived from the _live_ guide (see `packages/recheck/presets/google/PROVENANCE.md` for the rule -> source page -> quote -> verdict table, including everything considered and NOT shipped, and why).
  `extends: [recheck/google]` is a one-line adoption of Google's style; combine with `recheck/markdown` for full structural linting too.
  Rule ids are namespaced `google/<rule>` (not `recheck/<rule>`) so they never collide with the markdownlint-parity or other style-guide presets.
  Structural/mechanical rules (heading hierarchy, list mechanics, alt-text presence, sentence length) are `severity: error`; every word-choice, terminology, and punctuation-convention rule is `severity: warn`.
  See `packages/recheck/presets/google/sources.json` for the fetched-page hashes.
  **Adopting this preset has a real, measured performance cost — roughly 2.7× the standard `recheck/markdown`-only profile's lint time on a docs-sized document set** — see [Performance](#performance) below (Phase 4) before turning it on in CI.
- **`recheck/microsoft`** — the Microsoft Writing Style Guide (https://learn.microsoft.com/en-us/style-guide/welcome/), CC BY 4.0 (via the guide's backing GitHub repository's LICENSE file — no `learn.microsoft.com` page states the licence itself, see `packages/recheck/presets/microsoft/PROVENANCE.md`), synced 2026-07-30.
  93 rules covering heading/list/table/alt-text structure, the guide's own numeric thresholds (paragraph length, list length, comma density, alt-text length), its signature "use contractions" rule, US spelling, bias-free and people-first terminology, and a large A-Z terminology word list —
  all derived from the _live_ guide and checked against four independent verification passes (~490 rules/entries across ~340 page fetches), with every Tier-1 pair anchored or demoted to detection-only wherever it was found capable of rewriting correct prose.
  Rule ids are namespaced `microsoft/<rule>`.
  Structural rules and the A-Z word list's three unconditional tiers are `severity: error`; voice, punctuation-convention, and UI-terminology rules are `severity: warn`.
  Audience-conditional and UI-conditional entries (Microsoft's own "Tier 4") are never enforced, and developer-audience carve-outs relevant to API documentation (`header`, `context menu`, `disk`, `directory`) are excluded rather than misfiring on Redocly's own docs — see `packages/recheck/presets/microsoft/PROVENANCE.md` for the full table, every excluded candidate, and why.
  Unlike `recheck/google` (which allows `click`), this preset bans all input-specific UI verbs (`click`, `press`, `hit`) in favor of `select` — the sharpest divergence between the two guides.
  See `packages/recheck/presets/microsoft/sources.json` for the fetched-page hashes.
- **`recheck/inclusive-language`** — composable, guide-agnostic: the _intersection_ of `recheck/google` and `recheck/microsoft`'s inclusive/bias-free/ableist/accessibility content —
  terminology both flagship guides independently state should be avoided (`slave`, `master/slave`, `blacklist`/`whitelist`, `DMZ`, `grayed-out`, `he/she`, `normal person`/`healthy person`, `suffering from`/`victim of`, `differently abled`, `crippled`, `nuke`).
  All `warn` severity, all detection-only.
  Needed no new web fetch — every term was already confirmed against a live page by five existing verification reports; see `packages/recheck/presets/inclusive-language/PROVENANCE.md` for the report → row → term table and every single-guide term left out on purpose.
  Layer it onto either flagship or onto `recheck/prose`: `extends: [recheck/google, recheck/inclusive-language]`.
  **Because it's built as an intersection, every one of its 11 rules is already shipped by at least one flagship's own preset**
  (measured: 7 of 11 duplicate a `google/*` finding on the same span when stacked onto `recheck/google` alone, 6 of 11 duplicate a `microsoft/*` finding when stacked onto `recheck/microsoft` alone — see `packages/recheck/presets/inclusive-language/PROVENANCE.md`'s "Duplicate-finding audit").
  Its full, zero-duplicate value is realized standalone, with `recheck/prose`, or on a project using neither flagship; stacked onto exactly one flagship it still fills that flagship's own gaps, but expect a majority of its findings to be reported twice.
- **`recheck/plain-language`** — composable, derived from the _live_ US federal plain-language guidance (`digital.gov/guides/plain-language`; public domain, no attribution constraint).
  Smaller than a first read of the old `plainlanguage.gov` site would suggest:
  that site is now dead and redirects to a much thinner overview, so there's no sentence-length or readability-`metric` rule (`metric` stays a documented [opt-in](#opt-in-prose-assertions), unchanged) —
  only paragraph length (the one family with real, quotable numbers), filler/wordy phrases, complex-word substitutes, redundant pairs, double negatives, and jargon-to-plain examples.
  **`shall` is never flagged** — it's a defined RFC 2119 normative keyword used throughout specs and API docs, exactly what Recheck lints; `implement` and `command` carry the identical technical-sense collision and are excluded the same way.
  All `warn`/`error` (paragraph-length ceiling only) severity, all detection-only.
  `in order to` and `utilize`/`utilization` are deliberately NOT shipped despite being live, verbatim guide content — both flagships already ship the identical pair, so keeping them here would only ever produce a duplicate finding, never new coverage (measured: this cut duplicate findings on the same fixture from 6 to 3 against `recheck/google`, and from 5 to 3 against `recheck/microsoft`).
  The 3 that remain are an accepted paragraph-length overlap with `recheck/microsoft` (two independently-sourced numbers, not the same fact restated) and a coincidental substring collision with `use-contractions`, not content duplication.
  See `packages/recheck/presets/plain-language/PROVENANCE.md` for every rule's source quote, every family considered and left out, and the full duplicate-finding audit.

- **`recheck/technical-english`** — composable, an original rule set that helps writers follow the principles of ASD-STE100 Simplified Technical English: sentence length (max 25 words, the descriptive-text bound; tighten to 20 for procedures), paragraph length (max 6 sentences), and a passive-voice heuristic at `info`.
  ASD-STE100 Simplified Technical English is a Copyright and a Trade Mark of ASD, Brussels, Belgium.
  This preset is an independent work that ASD and the STEMG do not review, approve, certify, or endorse, and it reproduces no part of the standard — not its text and not its dictionary (compose with `recheck/plain-language` for word-choice checking).
  See `packages/recheck/presets/technical-english/PROVENANCE.md` for the STEMG correspondence and every deliberate omission.

  **All five of the presets above — `recheck/google`, `recheck/microsoft`,
  `recheck/inclusive-language`, `recheck/plain-language`, and `recheck/technical-english` — are
  detection-only by design, not by omission: no rule in any of them
  auto-fixes, ever.**
  This is enforced structurally (`fix: false` on every rule, set once by a
  loop at the end of each preset's builder function) and guarded by a test
  that reads the live preset object and fails if a future rule change ever
  makes one fixable again — see `preset-google.test.ts`'s and
  `preset-microsoft.test.ts`'s "is detection-only" describe blocks, and
  `preset-composition.test.ts`'s list-driven version covering all four.
  `recheck/google` and `recheck/microsoft` once had fixable rules.
  Every
  attempt to define a safe subset of them found the fixes corrupting
  genuinely correct prose, in every category previously believed safe:
  spelling (Hemingway's correctly spelled _A Moveable Feast_ → "A Movable
  Feast"), hyphenation ("read only the introduction" → "read-only the
  introduction"), and at least one outright inversion of meaning ("No SQL is
  used here" → "NoSQL is used here").
  A rule's _category_ does not predict
  fix safety at this scale: a style guide states intent while
  `swap`/`consistency`/`pattern` match tokens, and narrowing which
  categories count as "safe" doesn't close that gap.
  Detection is
  unaffected — every rule still runs and reports, and you apply the fix
  yourself with the judgment style guidance has always required.
  This is the
  same reason Vale, the tool these presets replace, never shipped this class
  of bug.
  See the "Detection-only" sections of
  `packages/recheck/presets/google/PROVENANCE.md` and
  `packages/recheck/presets/microsoft/PROVENANCE.md` for the full history.

  The heading rule uses **sentence case** _(changed from AP title case by product decision 2026-07-29: Redocly's own guide, Google, and Microsoft all mandate sentence case)_.
  Two details make that default safe out of the box:
  - **The [built-in technical proper-noun vocabulary](#built-in-technical-proper-noun-vocabulary)** — `TECHNICAL_PROPER_NOUNS` — is unioned into `exceptions` by `capitalization` itself (default `builtinVocabulary: true`), so this preset doesn't ship its own copy: `$sentence` still won't flag `OpenAPI`, `GitHub`, `macOS`, and the rest of that list out of the box.
    It's a common-vocabulary floor, not a full brand list — extend it with your own product/company names via this rule's own `exceptions`, which **compose** with the built-ins rather than replacing them (unlike a preset-shipped list, which a same-key override would have replaced entirely).
  - **`fix: false`** — a sentence-case auto-fix would lowercase any proper noun the built-ins and your own `exceptions` don't cover, silently damaging content.
    Set `fix: true` on your own `recheck/capitalization` key (or drop the key) once your exceptions list covers your vocabulary.

```yaml
extends:
  - recheck/markdown-relaxed

# Your own overrides win over the preset:
recheck/line-length:
  severity: warn
  assertions:
    line-length:
      lineLength: 120
```

Multiple presets can be listed; later presets in the list override earlier ones for the same rule key, before your own top-level rule keys are merged in last.

### Tune a preset

Adopting a whole style-guide preset doesn't mean accepting every rule at its shipped severity.
Because your own config's rule keys always win over a preset's (see above), you can turn individual rules off, downgrade them, or silence single occurrences — all verified against a live build, not just read from source:

```yaml
extends: [recheck/markdown, recheck/microsoft]

microsoft/az-navigation:
  severity: off # turn a rule off entirely

microsoft/heading-sentence-case:
  severity: warn # downgrade an error to a warning (this rule ships at error)
```

Or silence one occurrence instead of the whole rule, with an inline directive (works on any rule, from any preset — see [Inline Directives](#inline-directives) above):

```markdown
<!-- recheck-disable-next-line microsoft/az-navigation -->

Click the hot link to continue.

<!-- recheck-disable microsoft/az-navigation -->

...several occurrences here are all silenced...

<!-- recheck-enable microsoft/az-navigation -->

<!-- recheck-disable-file -->
```

**The sharp edge:** merging a user override on top of a preset rule happens per _assertion id_, not per option inside it.
Setting a partial override on a bundled `swap` or `pattern` rule doesn't just change the one option you named — it **replaces that assertion object entirely**, silently discarding everything else it carried.
For example:

```yaml
microsoft/spelling-hyphenation:
  assertions:
    swap:
      ignoreCase: false
```

drops the preset's whole `pairs` map along with it, and the config then fails validation outright (verified against this exact rule on a live build):

```text
Rule "microsoft/spelling-hyphenation": swap requires a "pairs" object mapping find -> replace strings
```

So today, to reject just one term out of a bundled `swap`/`pattern` rule, your options are: turn the whole rule off, restate its entire `pairs`/`tokens` yourself, or inline-disable each occurrence as shown above.
Two assertion types already have a real per-term escape hatch that doesn't hit this edge: `capitalization`'s `exceptions` (an array of allowed terms that **composes** with the built-in technical-proper-noun vocabulary and anything else you add, rather than replacing it) and `spelling`'s `ignore`.
A per-term opt-out for `swap`/`pattern` is a known follow-up, not shipped yet.

### Example configs

`packages/recheck/examples/{google,microsoft,inclusive-language,plain-language,technical-english}.yaml` are ready-to-copy configs for the five style presets,
generated by `pnpm examples:generate` (`packages/recheck/scripts/generate-examples.mjs`) so they can never drift from the preset they document —
a test (`src/config/__tests__/examples-drift.test.ts`) byte-compares each on-disk file against a fresh render and fails, naming the file, if either the preset or the file's own hand-maintained appendix (`examples/appendices/<name>.appendix.yaml`) changes without regenerating.

Each file has four parts, in this order:

1. **An attribution header** — source, license, and sync date, as YAML comments (mirrors that preset's `PROVENANCE.md`).
2. **`# What to paste`** — the actual adoption cost: a two-to-four-line `extends` block.
   This is the only part most readers need; everything below it is supporting material, not something to copy.
3. **`# How to tune it`** — override patterns verified to work today (turn a rule off, downgrade its severity, inline-disable one occurrence with an HTML comment),
   plus a documented sharp edge: overriding one option on a bundled `swap`/`pattern` rule's `assertions` **replaces that assertion entirely**, silently discarding options like a `pairs` map you didn't restate (merging is per _assertion id_, not per option) —
   restate the whole map, turn the rule off, or use an inline directive instead.
   `capitalization`'s `exceptions` and `spelling`'s `ignore` are the two assertion types that already have a real per-term escape hatch; an equivalent for `swap`/`pattern` is a known follow-up, not shipped yet.
4. **`# Full expansion (reference)`** — the preset's entire resolved rule set (alphabetized), so a reader can see exactly what they're adopting without running the tool.
   Every value here is identical to what the `extends` block above already resolves to, so copying this section too is redundant, not broken — it's for reading, not pasting.

A hand-maintained appendix is appended verbatim after part 4: NOISY candidates the guide states but the preset doesn't enforce (shown as the rule they'd be if shipped, commented out, with a one-line false-positive note each) and a checklist of guide content that needs a human, not a linter (NOT-ENFORCEABLE — active voice, missing-Oxford-comma detection, and similar).

### Opt-in prose assertions

`recheck/prose` (above) intentionally ships only `repetition`, `consistency`, and `capitalization` — a small, broadly-applicable default.
Three more Vale-parity/native assertions exist (see [Assertion Types](#assertion-types) above for full per-option tables) but are **not shipped in any preset**, because their thresholds, patterns, or dictionaries are inherently project-specific rather than having one right-for-everyone default: `conditional`, `metric`, `spelling`.
(`length` and `occurrence` used to be entries here; neither is an opt-in any more — [`recheck/google`](#extends-presets) ships `length` directly for the guide's sentence-length limit, and [`recheck/microsoft`](#extends-presets) ships `occurrence` directly for the guide's comma-density rule, so neither one's default bounds are "no one right answer" any more.)
Add any of the three by copying its rule below into your own config, alongside `extends: [recheck/prose]`:

```yaml
extends: [recheck/markdown, recheck/prose]

# conditional: if "TBD" appears, a tracking-issue link must exist somewhere in the file.
recheck/tbd-needs-tracking-link:
  severity: warn
  message: '"%s" appears but "%s" was never introduced.'
  assertions:
    conditional:
      first: '\bTBD\b'
      second: 'https://github\.com/\S+/issues/\d+'

# metric: flag prose below a Flesch reading-ease floor (higher score = easier to read).
# The message's four slots are positional: formula, score, min, max (see "Metric Assertions").
recheck/readability-floor:
  severity: warn
  message: 'Readability (%s) is %s; expected between %s and %s.'
  assertions:
    metric:
      formula: flesch-reading-ease
      min: 30

# spelling: requires the optional `nspell`/`dictionary-en` peers -- see
# "Spelling Assertions" above for the install command.
recheck/us-spelling-check:
  severity: warn
  message: 'Unknown word "%s"%s'
  assertions:
    spelling:
      vocab: [Redocly, Reunite]
```

Each snippet's `severity`, `message`, `scope`, and `exceptions` are yours to adjust — see [Rule Types and Assertions](#rule-types-and-assertions) for every option each assertion accepts, and [Inline Directives](#inline-directives) to silence any one of them on a specific line or file with an HTML comment instead of turning it off entirely.

### Migrate from markdownlint

A markdownlint config maps onto Recheck almost 1:1 — `extends` a preset, then override individual rules by their Recheck name (same short name markdownlint uses, e.g. `line-length` for MD013) under `assertions`:

```yaml
extends:
  - recheck/markdown

recheck/line-length:
  severity: warn
  message: 'Keep lines under %s characters.'
  assertions:
    line-length:
      lineLength: 120
      codeBlocks: false

recheck/ul-style:
  severity: off
```

**Renamed legacy assertion ids — old ids are no longer accepted.**
A handful of ids from Recheck's pre-parity native rules were converged onto their markdownlint-parity replacements.
These four were removed outright, not kept as aliases: using the old id in a config now fails validation with an `unknown assertion type "<old>"` error, and the config must be updated to the new id:

| Old id (removed)           | Use instead                    |
| -------------------------- | ------------------------------ |
| `max-line-length`          | `line-length` (MD013)          |
| `bullet-style`             | `ul-style` (MD004)             |
| `no-duplicate-headings`    | `no-duplicate-heading` (MD024) |
| `no-broken-fragment-links` | `link-fragments` (MD051)       |

Two other ids are **upstream markdownlint's own alternate rule names**, not a Recheck deprecation — these remain permanent, warning-free aliases and require no config change:

| Upstream synonym     | Canonical id            |
| -------------------- | ----------------------- |
| `first-line-heading` | `first-line-h1` (MD041) |
| `single-title`       | `single-h1` (MD025)     |

**Two intentional behavior changes** vs. plain markdownlint defaults, both on rules that predate the parity port and kept their exact ids:

- **`no-trailing-spaces` (MD009)** now exempts lines with _exactly 2_ trailing spaces by default (a markdown hard line break), instead of flagging all trailing whitespace.
  Set `strict: true` to restore the old flag-everything behavior (matches markdownlint's default).
- **`no-hard-tabs` (MD010)**'s `spacesPerTab` option now defaults to `1` (matching markdownlint's own upstream default) — Recheck's earlier, pre-parity native rule had defaulted this to `2`.
  If you were relying on that old default, set `spacesPerTab: 2` explicitly.

Token-rule options aren't individually schema-validated, so an option name a rule doesn't recognize is silently ignored — it has no effect, and produces no warning or error.

### Cross-file link validation

`link-fragments` accepts `crossFile: true` to validate links across files, replacing external link checkers such as `mlc` for repo-internal links:

- A relative link or image target must exist on disk (`[x](./missing.md)` flags).
- A `file.md#anchor` fragment must exist in the target file's headings and anchors.
- Extensionless links resolve the way the Realm router does: `./page` tries `page.md`, and a directory link reads its `index.md`.
- Site-root absolute paths (`/x/y`) resolve against the `rootDir` option when set, and are skipped without it.
- `ignoredTargets` skips destinations by glob (`['/gateways/**']`) — for routes a renderer generates from data, with no file on disk.
- Links to `<details>` sections resolve: a `<details>` without an explicit `id` gets one derived from its `<summary>` text, the same way the theme generates them in the browser.
- Markdoc tags in headings (`## Payments {% badge /%}`) do not change the heading's anchor.
  In a monorepo with several docs projects, give `rootDir` a map from source-directory prefix to that directory's site root; the longest matching prefix wins, and files under no prefix keep the skip.
  Paths are relative to the working directory.
- External URLs and `mailto:` are skipped.

Each target file is read once per run and cached by modification time.
The option is off by default; in-document fragment checking is unchanged.

### Known differences from markdownlint

- **Inline HTML-comment disable directives are not supported**, for example:

  ```html
  <!-- markdownlint&#45;disable -->
  ```

  (dash HTML-escaped above so this very README doesn't trip markdownlint's own directive scanner — markdownlint recognizes these directives even inside fenced code, so the literal syntax can't appear here unescaped).
  Markdownlint's HTML-comment-based per-line/per-region rule toggles (`markdownlint-disable`, `markdownlint-disable-next-line`, `markdownlint-enable`, etc.) are a distinct engine feature, not a rule port, and Recheck doesn't parse them today.
  Use config-level `exceptions` (file/line patterns) or `excludes`/`appliesTo` to achieve the same effect.
  Native support is a possible future addition; no decision has been made yet.

### Parity with markdownlint

The 53 ported rules are checked against upstream markdownlint by a differential harness (`pnpm parity`, `benchmarks/parity/run-parity.mjs`): the harness lints the same real-world document set with both Recheck (via a config translated from markdownlint's option surface) and markdownlint itself, then set-diffs the findings.
As of this writing it reports **zero unexplained differences** across:

- `mdn-content` (MDN Web Docs, ~14.5k files)
- `electron` (Electron's docs + repo markdown)
- `monorepo-docs` (this monorepo's own `docs/` tree)

on both the `default` profile (full `recheck/markdown` preset vs. markdownlint `{ default: true }`) and a `rebilly` profile (a real third-party `.markdownlint.yaml` translated to Recheck config).
A small, explicitly documented allowlist (`benchmarks/parity/allowlist.json`) covers the one known permanent engine-surface gap — inline `markdownlint-disable` directives (see [Known differences](#known-differences-from-markdownlint) above) — scoped to the exact rules it can affect (MD010, MD011, MD033, MD059).
Everything else matches exactly.

**`pnpm parity` requires `--corpus`** — running it bare exits `2` with a usage error (`Usage: node benchmarks/parity/run-parity.mjs --corpus <name> [--profile default|rebilly] [--rules MD001,MD013]`) rather than running against a default document set.
Always pass a document-set name, e.g. `pnpm parity --corpus monorepo-docs --profile default`.

### Front matter validation

The `front-matter` token rule validates front matter against JSON Schema, using `@redocly/ajv` — the same validator Redocly CLI uses.
Map file patterns to schemas; the first matching mapping wins, and a file that matches no mapping is not checked.

```yaml
recheck/front-matter:
  severity: error
  message: 'Front matter: %s'
  assertions:
    front-matter:
      schemas:
        - files: ['.changeset/**']
          schema:
            type: object
            patternProperties:
              '^@redocly/': { enum: [major, minor, patch] }
            additionalProperties: false
        - files: ['docs/**']
          schemaFile: schemas/docs-front-matter.yaml
```

- `schema` is an inline JSON Schema object, or the name of a built-in schema (see below); `schemaFile` loads one from a YAML or JSON file, relative to the working directory.
- A file with no front matter validates as an empty object, so the schema's `required` list decides whether front matter is mandatory.
- Findings point at the line of the offending top-level key; front matter that is not valid YAML is one finding at the block start.

#### Built-in schema: Realm page front matter

`schema: realm` validates the front matter options a Realm page accepts, so a project gets the check without vendoring a copy that goes stale:

```yaml
- files: ['docs/**']
  schema: realm
  strict: true
```

It covers the front-matter-only options (`excludeFromSearch`, `sidebar`, `slug`, `template`, `navigation`, `keywords`), the options that override `redocly.yaml` (`banner`, `breadcrumbs`, `codeSnippet`, `colorMode`, `feedback`, `footer`, `markdown`, `metadata`, `navbar`, `navigation`, `rbac`, `redirects`, `search`, `seo`, `versionPicker`), and `title`/`description`.

The schema checks the **type** of each known key, not the inner shape of the option objects.
`seo`, `markdown`, and their siblings are whole configuration blocks that Realm evolves independently, so encoding their structure here would drift and start rejecting valid pages.
Type checking still catches what actually goes wrong: a misspelled key (with `strict`), and a value of the wrong kind (`excludeFromSearch: "true"`).

`strict: true` adds `additionalProperties: false`, which turns a misspelled option into a finding.
It is off by default because pages carry project data that Markdoc templates read back through `$frontmatter.<key>` — Redocly's own docs use `products` and `plans` this way on 268 pages.
To keep `strict` and allow your own keys, copy the built-in as a starting point and add them.

## GitHub Actions Integration

Recheck provides seamless GitHub Actions integration for automated content quality checking on pull requests.

### Output Format: `github-actions`

Use the `--output github-actions` format to generate inline file annotations that appear directly on pull request files:

```bash
# Basic GitHub Actions output
node dist/cli.js docs --output github-actions

# With annotation limits (recommended for PR workflows)
node dist/cli.js docs --output github-actions --annotations-limit 20
```

### Annotation Output

The GitHub Actions format produces annotations that GitHub automatically displays as inline comments:

```text
::error title=recheck/no-trailing-spaces,file=docs/guide.md,line=42,col=15,endColumn=18::Trailing spaces
::warning title=recheck/ul-style,file=docs/api.md,line=23,col=1,endColumn=2::Unordered list style
```

### GitHub Actions Limits

GitHub Actions has strict limits on annotations:

- **10 error** and **10 warning** annotations per step
- **50 total** annotations per job

**Recommendation**: Use `--annotations-limit 20` (the default) to stay well within these limits while prioritizing the most critical issues.

### Workflow Example

```yaml
- name: Run recheck with inline annotations
  run: |
    node packages/recheck/dist/cli.js docs \
      --config recheck.yaml \
      --output github-actions \
      --changed-only < changed-files.txt
```

This creates both inline file annotations AND summary comments when combined with the PR comment workflow.

## Performance

Recheck's file-first, parse-once architecture is benchmarked directly against `markdownlint`'s own library API (`benchmarks/run-markdownlint.mjs`) on the same corpora, using `pnpm bench` (see `benchmarks/bench.mjs`):

- **Phase 1** (10 native scope rules vs. markdownlint's default rules, `monorepo-docs` document set, 953 files): recheck **0.91×** markdownlint's median time (3219ms vs. 3521ms) — see `benchmarks/results/phase1-ast-core.json` / `baseline-markdownlint.json`.
- **Phase 2** (all 53 markdownlint-parity rules via `extends: [recheck/markdown]` vs. markdownlint's `{ default: true }`, equivalent rule sets):
  - `monorepo-docs` (954 files): recheck 4468ms vs. markdownlint 3755ms — **1.19×**.
  - `mdn-content` (14,515 files, a real-world OSS document set): recheck 41839ms vs. markdownlint 34548ms — **1.21×**.

Both Phase 2 numbers sit comfortably inside the ±40% parity gate (recheck's median must fall within `[0.6×, 1.4×]` of markdownlint's on an equivalent rule set) enforced by:

```bash
pnpm bench --subject benchmarks/run-recheck-mdl-preset.mjs --corpus monorepo-docs --record <label>
pnpm bench --subject benchmarks/run-markdownlint.mjs --corpus monorepo-docs --record <label>
```

Recheck trades a bit of the Phase 1 constant-factor lead for full rule-count parity (53 rules vs. 10) — still within budget, and the shared AST-parse-once architecture means adding prose/style rules on top costs little extra, since markdown structure parsing is already paid for.

- **Phase 3** (prose profile — the standard Phase 2 rule set vs. that same set plus the Vale-parity prose additions, `monorepo-docs` document set, the same set on both sides):
  - Standard profile (`recheck-mdl-preset.yaml`, `extends: [recheck/markdown]`, 53 rules, `run-recheck-mdl-preset.mjs`, 965 files): **4072ms** median — **-8.9% vs the Phase 2 recording** (`phase2-parity-recheck`, 4468ms, 954 files),
    i.e. no regression from the Phase 3 rule-registry additions, since the standard profile doesn't exercise any of them (the small speedup is run-to-run variance plus the document-set size difference, not an optimization claim).
  - Prose profile (`recheck-prose-bench.yaml`, `extends: [recheck/markdown, recheck/prose]` plus one opt-in `occurrence` rule and one opt-in `conditional` rule, 58 rules, `run-recheck-prose.mjs`, same 965 files): **4547ms** median — **+11.7%** vs. the standard profile above, for the five added prose/scope rules (`repetition`, `consistency`, `capitalization`, and the two opt-ins).
    Comfortably under the "investigate if >2x standard" threshold; no pathological per-rule cost found.
    There is no hard pass/fail gate for this profile (new profile, first recording) — these numbers establish its baseline.
  - Measured 2026-07-27 (local time; the result JSONs record the UTC date `2026-07-28`, so the file dates and this measurement date differ by design, not by error) at commit `27a8b6feb10` (immediately prior to the commit that added this benchmark profile), on an Apple M2 Max / Darwin 24.6.0 / Node v23.7.0 machine;
    single 3-run session, not a statistically rigorous multi-session average — treat the deltas as directional, not precise.
    `pnpm bench --subject <script> --corpus monorepo-docs --runs 3 --record <label>` (median of 3 timed runs after 1 warm-up); recorded to `benchmarks/results/phase3-prose-standard.json` / `phase3-prose-profile.json`.
    A `--corpus self` (2-file) smoke pair recorded to `phase3-prose-standard-self.json` / `phase3-prose-profile-self.json` proves the harness/subject-script mechanics end-to-end but isn't large enough to be a meaningful timing signal on its own.

- **Phase 4** (refreshed standard/prose figures plus the new `recheck/google` profile, `monorepo-docs` document set, the same set across all three, 968 files — the document set grew by 3 files since the Phase 3 recording):
  - Standard profile (same config as Phase 2/3, `recheck-mdl-preset.yaml`, 53 rules): **4350ms** median (runs 4341/4350/4369ms — 28ms spread, 0.6% of median: a tight, trustworthy measurement).
    This refreshes — and for current comparisons supersedes — Phase 3's `4072ms`/965-file recording; the ~7% difference is within normal session-to-session noise (different process/cache/scheduler state), not a regression, and there is still no rule-registry change that would affect this profile.
  - Prose profile (same config as Phase 3, `recheck-prose-bench.yaml`, 58 rules): **4801ms** median (runs 4599/4801/4840ms — 241ms spread, 5.0% of median) — **+10.4%** vs. the refreshed standard profile above.
    This is the requested refresh of the Phase 3 prose figures, which the `capitalization` default's AP-title-case → sentence-case change (2026-07-29, see [`extends` presets](#extends-presets) below) made marginally stale, since this profile's `capitalization` rule is exactly what that change touched.
    The new delta (+10.4%) is close to Phase 3's original (+11.7%); given the 5.0% run-to-run spread observed here, treat both numbers as directionally consistent, not as proof of a precise change in cost — same posture Phase 3 itself took.
  - **`recheck/google` profile** (new — `recheck-google-bench.yaml`, `extends: [recheck/markdown, recheck/google]`, 152 rules total: the same 53-rule structural set plus all 99 rules `recheck/google` ships, `run-recheck-google.mjs`, same 968 files): **11792ms** median (runs 11628/11792/12164ms — 536ms spread, 4.5% of median).
    - **This profile is substantially more expensive than either profile above: roughly 2.7× (~+171%) the standard profile's median time**, a materially different result from the ~1.1–1.2× range Phase 2/3 established for the markdownlint-parity and Vale-parity workloads.
      This is recorded as a **new baseline on its own terms, not a regression against the standard-profile's ±40% parity gate** — that gate applies only to `recheck/markdown` vs. markdownlint's equivalent rule set (Phase 2, unaffected by this preset's addition) and was never meant to bound a ~99-rule prose-preset workload layered on top of it.
      The number is reported as measured, without tuning the preset to improve it.
    - The ~171% delta is far larger than the ≤5% run-to-run spread measured on all three profiles this session, so the _direction and rough magnitude_ of "the Google preset costs several times more than the structural set alone" is trustworthy; the precise "171%" is not — this is a single 3-run-median session on one developer machine, not a statistically rigorous benchmark.
      Read it as "roughly 2.5–3×," not as a number with two decimal digits of meaning.
    - **What this means for adopters**: turning on `extends: [recheck/google]` roughly triples per-run lint time on a docs-sized document set (968 files: ~4.3s → ~11.8s).
      That is a real, user-facing cost, stated here so it is visible before adoption rather than discovered later in CI — projects sensitive to CI duration should budget for it explicitly (e.g., a separate, non-blocking job, or a scheduled run) rather than assuming `recheck/google` is free to layer on top of `recheck/markdown`.
  - Measured 2026-07-30 at commit `7c50caaaf05` (immediately prior to the commit that adds this benchmark profile), on the same Apple M2 Max / Darwin 24.6.0 / Node v23.7.0 machine as Phase 1–3; single 3-run session per profile (1 warm-up + 3 timed runs), same caveats as Phase 3 — treat deltas as directional, not precise.
    `pnpm bench --subject <script> --corpus monorepo-docs --runs 3 --record <label>`; recorded to `benchmarks/results/phase4-google-standard.json` / `phase4-google-prose-refresh.json` / `phase4-google-profile.json`.

- **Markdoc parse cost** (`parseMarkdown` in isolation — no rules, no config validation — flag off vs. flag on, `monorepo-docs` document set, 981 files, `run-recheck-parse.mjs` / `run-recheck-parse-markdoc.mjs`): flag off **2825ms** median (runs 2784/2825/2966ms) vs. flag on **2896ms** median (runs 2864/2896/3101ms) — **+2.5%**.
  That gap is smaller than the ~240–280ms run-to-run spread on either side, so read it as "no measurable parse-time cost from turning `markdoc: true` on" rather than a precise 2.5% overhead; the number is reported as measured.
  This is its own baseline row — there is no earlier "parse only, flag off" recording to compare against — and it is deliberately not gated against the ±40% markdownlint-parity budget above, which covers the 53-rule structural comparison and never sets this flag.
  Measured 2026-08-02 at commit `db8df4378ff`, on the same Apple M2 Max / Darwin 24.6.0 / Node v23.7.0 machine as the phases above; single 3-run session per side.
  `pnpm bench --subject benchmarks/run-recheck-parse.mjs --corpus monorepo-docs --runs 3 --record <label>` (and the `-markdoc` sibling script for the flag-on side); recorded to `benchmarks/results/markdoc-parse-cost-flag-off.json` / `markdoc-parse-cost-flag-on.json`.
- ✅ **Scalable**: File-first architecture with rule indexing optimizes for large repositories; the same micromark AST backs both markdown-structure rules and prose-scope rules, so combining both rule families costs one parse, not two.

## Dependencies

### Runtime Dependencies

- `@redocly/ajv` + `ajv-formats` - JSON Schema validation
- `js-yaml` - YAML configuration parsing
- `yargs` - CLI interface
- `colorette` - Terminal colors
- `picomatch` - File pattern matching
- `micromark` + `micromark-extension-directive`, `micromark-extension-frontmatter`, `micromark-extension-gfm-autolink-literal`, `micromark-extension-gfm-footnote`, `micromark-extension-gfm-table`, `micromark-extension-math` - the markdown parser (and its GFM/frontmatter/directive/math extensions) backing the shared token tree that both markdown-structure and prose/scope rules run against
- `string-width` - measures the display width of strings containing wide/ambiguous-width or ANSI-styled characters, for CLI table output alignment

### Optional Peer Dependencies

- `nspell` + `dictionary-en` - Hunspell-compatible spell checker (and its bundled English dictionary) backing the `spelling` assertion (see [Spelling Assertions](#spelling-assertions-spelling) above).
  **Not installed by installing `@redocly/recheck`** — both are declared `optional: true` in `peerDependenciesMeta`, loaded lazily via dynamic `import()` only when a config actually enables `spelling`.
  Run `npm i nspell dictionary-en` to enable it (or just `npm i nspell` if every `spelling` rule supplies its own `dictionary` path).

### Development Dependencies

- `vitest` - Modern testing framework
- `typescript` - Type checking and compilation
- `markdownlint` - upstream reference implementation, used by the differential parity harness (`pnpm parity`) and its own smoke tests, not by Recheck itself at runtime
- `nspell` + `dictionary-en` - pinned here too (see Optional Peer Dependencies above) so this package's own test suite can exercise the real speller against real dictionary data
- `@types/*` - TypeScript definitions

## Example Output

### Standard Run

```text
🏃 Running recheck on: docs/
✅ Configuration loaded successfully!
   Config file: recheck.yaml
   Loaded 8 rule(s)
   Disabled 1 rule(s) (severity: off)

🔧 Running 8 rule(s)...
   Found 311 markdown file(s)
   Checking rule: us-spelling...
   Checking rule: no-gerund-headings...
   Checking rule: oxford-comma...
   Checking rule: no-trailing-spaces...
   Checking rule: ul-style...
   Checking rule: semantic-line-breaks...
   Checking rule: no-hard-tabs...
   Checking rule: no-duplicate-heading...

📋 Found 1086 issue(s):

us-spelling               README.md:68:5      Use the US spelling "color" instead of British "colour".
no-trailing-spaces        README.md:15:42     Trailing spaces
ul-style                  docs/guide.md:22:1  Unordered list style

   65 error(s)
   1021 warning(s)

❌ Found 65 error(s). Exiting with code 1.
   Completed in 156ms
```

### JSON Output

```json
{
  "summary": {
    "filesScanned": 311,
    "totalIssues": 1086,
    "breakdown": {
      "recheck/no-trailing-spaces": {
        "errors": 65,
        "warnings": 0,
        "info": 0,
        "total": 65
      },
      "recheck/ul-style": {
        "errors": 1021,
        "warnings": 0,
        "info": 0,
        "total": 1021
      }
    }
  },
  "issues": [
    {
      "file": "../../docs/realm/branding/index.md",
      "line": 13,
      "column": 22,
      "text": "Use the brand guidelines when applying Redocly brand",
      "match": "  ",
      "ruleName": "recheck/no-trailing-spaces",
      "severity": "error",
      "message": "Trailing spaces"
    }
  ]
}
```

## What's Working Now

- ✅ **Modern Architecture**: File-first processing — each file is parsed once into a micromark AST, then segmented into scopes for rule application
- ✅ **Vale Compatibility**: Scope notation compatible with Vale linter
- ✅ **Swap Rules**: Find and replace text patterns with word boundaries and case sensitivity
- ✅ **Pattern Rules**: Regex matching with precise scope filtering
- ✅ **Built-in Assertions**: `swap` and `pattern` general-purpose assertions, a small set of native prose assertions, and 53 markdownlint-parity rules — all fully implemented with comprehensive tests
- ✅ **File Discovery**: Recursive markdown file finding with common directory exclusions
- ✅ **Multiple Output Formats**: Human-readable table, structured JSON, SARIF, and GitHub Actions
- ✅ **Severity Filtering**: Show only errors, warnings, or all issues
- ✅ **Exit Codes**: Non-zero exit when errors found (perfect for CI)
- ✅ **Exception Handling**: Skip lines and files that match exception patterns
- ✅ **Auto-Fix**: Safe automatic correction for appropriate rules
- ✅ **Production Scale**: Successfully handles large documentation repositories
- ✅ **Comprehensive Testing**: Full Vitest test suite covering the parser, scope extractor, config validation, rules, and CLI

### Key Design Principles

- **File-First Processing**: Iterate by files, then by semantic scopes within files
- **Scope-Based Rules**: Apply rules only to relevant content scopes
- **Type Safety**: Full TypeScript coverage with strict typing
- **AST-Based Parsing**: A micromark token tree per file backs scope segmentation, replacing regex-based scope parsing
- **Modular Rules**: Each built-in rule in its own file with dedicated tests
- **Safe Auto-Fix**: Granular control over which rules can auto-fix
- **Vale Compatibility**: Scope notation compatible with existing Vale configurations

## File Targeting

Rules can target specific files using path patterns with `appliesTo` and `excludes`:

### Apply Rules to Specific Files

```yaml
recheck/config-docs-only:
  severity: error
  message: 'Config docs must follow specific patterns'
  appliesTo:
    - 'docs/config/**' # All files in docs/config directory
    - '**/api/*.md' # All .md files in any api directory
    - '*.config.md' # Files ending with .config.md
  assertions:
    pattern:
      tokens: ['TODO']

recheck/api-standards:
  severity: warn
  message: 'API docs need review'
  appliesTo:
    - 'docs/api/**' # Target API documentation
    - '**/endpoints/*.md' # Target endpoint documentation
  assertions:
    pattern:
      tokens: ['DRAFT', 'TBD']
```

### Exclude Files from Rules

```yaml
recheck/no-todos:
  severity: error
  message: 'No TODOs allowed'
  excludes:
    - 'docs/drafts/**' # Exclude all draft documents
    - '**/temp*.md' # Exclude temporary files
    - 'README.md' # Exclude specific file
  assertions:
    pattern:
      tokens: ['TODO']
```

### Path Pattern Support

File targeting supports multiple pattern types:

- **Full path patterns**: `docs/config/**`, `src/components/*.md`
- **Recursive patterns**: `**/api/*.md`, `**/README.md`
- **Basename patterns**: `*.config.md`, `temp*.md` (backward compatible)
- **Exact matches**: `README.md`, `docs/guide.md`

### Pattern Matching Strategy

The enhanced pattern matching checks patterns against:

1. **Filename** (`config.md`) - for simple patterns
2. **Relative path** (`docs/config/settings.md`) - for full path patterns
3. **Path segments** (`config/settings.md`) - for partial path patterns

This allows flexible targeting while maintaining backward compatibility.

## Contribute

Want to add new assertions or improve existing ones?
Check out our **[Contributing Guide](src/rules/CONTRIBUTING.md)** for:

- 🏗️ **Architecture overview** - How parse-once file processing and centralized scope filtering work
- 📝 **Step-by-step guide** - Create new assertions following best practices
- 🧪 **Testing guidelines** - Comprehensive test coverage examples
- ✅ **Code standards** - Follow our established conventions
- 🚀 **Quick examples** - Get started with working code templates

The guide covers our modern architecture where the **runner handles parsing and scope filtering automatically**.
An assertion's `execute`/`fix` functions can focus on their core logic instead of re-implementing segment selection or file I/O.

## Future Enhancements

1. **Plugin System**: Custom rule loading from external files/packages
2. **Configuration Inheritance**: Config file discovery and inheritance
3. **Watch Mode**: Real-time linting as files change
4. **IDE Integration**: Language server protocol support
5. **Additional Scopes**: Support for more Vale-compatible scopes
