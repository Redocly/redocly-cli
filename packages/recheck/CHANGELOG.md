# @redocly/recheck

From version 2.x this package lives in the `redocly-cli` repository and releases with Redocly CLI.
Entries below 2.x come from its previous home.

## 0.12.0

### Minor Changes

- f564df1f13f: Added an embedded mode for markdown that lives inside another document, such as an OpenAPI `description` field.
  The engine's `embedded` option parses a leading `---` as content instead of front matter, and drops the rules embedded markdown cannot support, even when a config names them.
  Added the `recheck/api-descriptions` preset: the markdown rules that make sense for description fields, curated from measurements over two large API definitions.

## 0.11.1

### Patch Changes

- ecf6b33ae2b: Fixed `link-fragments` reporting valid deep links to `accordion` Markdoc tags as broken.
  The rule resolves accordion anchors from the `title` attribute, the same way the theme generates ids for `details` elements, in the same file and across files with `crossFile`.

## 0.11.0

### Minor Changes

- 074add45843: Added a built-in Realm front matter schema, selected with `schema: realm`, that validates the options a Realm page accepts without vendoring a copy that goes stale.
  Added a `strict: true` option that turns a misspelled front matter option into a finding.

## 0.10.0

### Minor Changes

- 0c017e5da0b: Unified Recheck into one command, matching the interface planned for `redocly recheck`: linting runs by default, and the other actions moved to flags.
  `recheck run <path>` becomes `recheck <path>`, `recheck readability <path>` becomes `recheck <path> --readability`, `recheck baseline <path>` becomes `recheck <path> --generate-baseline`, `recheck validate` becomes `recheck --validate-config`, and `recheck markdoc-schema` becomes `recheck --generate-markdoc-schema`.
  A removed subcommand fails with the exact replacement invocation.

### Patch Changes

- 04f17f80cb7: Fixed sentence detection in blockquotes: quote continuation markers no longer glue sentences together, and a blank line (quoted or not) now always ends a sentence, even without terminal punctuation.
  A leading bold label (`**Label:** Description.`) no longer counts toward a sentence's word count in `length` rules such as `technical-english/sentence-length`.
- fa0297e8cf2: Fenced code, html blocks, and comments nested inside blockquotes or list items no longer count toward sentence-scoped rules: sentences now derive only from the prose around them.
  The `run` command now reports an error when given more than one path instead of silently scanning only the first.
- b9771145bba: Fixed sentence splitting at: indented continuation lines, terminators inside closing emphasis or quotes, next sentences that open with emphasis markers, and Markdown hard breaks.
  Sentences inside multi-line list items, blockquotes, and Markdoc tag bodies were joined into one span.

## 0.9.0

### Minor Changes

- 5bb15bcbb85: Added `recheck/technical-english`: a preset that helps writers follow the principles of ASD-STE100 Simplified Technical English — sentence length, paragraph length, and passive voice.
  ASD-STE100 Simplified Technical English is a Copyright and a Trade Mark of ASD, Brussels, Belgium.

  The preset is an independent work, not endorsed by ASD or the STEMG, and reproduces no part of the standard.

### Patch Changes

- b1ae95e5f84: Updated the built-in Realm Markdoc schema with additional attributes for the `card` tag: `linkIcon`, `cta`, `iconColor`, `badge`, `badgeColor`, and `badgeIcon`.

## 0.8.0

### Minor Changes

- 1c5d579c05a: Added two agent skills to the npm package under `skills/`:
  - `recheck-lint` tells an agent to run recheck on touched Markdown before committing or outputting it
  - `recheck-config` guides writing and tuning `recheck.yaml` from measured counts
    Copy them into `.claude/skills/` (or an equivalent) to make every agent a recheck user.
- f1bc475d0e7: Cross-file link validation was improved to correctly resolve links to `<details>` sections, prevent Markdoc tags in headings from changing anchors, and support an `ignoredTargets` option to skip renderer-generated routes by glob.

## 0.7.0

### Minor Changes

- 50a631cb634: Added the `front-matter` rule: it validates front matter against JSON Schema with `@redocly/ajv`, the validator Redocly CLI uses.
  Map file patterns to inline schemas or schema files; findings point at the offending key's line, a file with no front matter validates as an empty object, and invalid YAML is reported at the block start.

## 0.6.0

### Minor Changes

- 17ffa8b9b99: Added `rootDir` to the `link-fragments` assertion: with `crossFile: true`, site-root absolute links (`/x/y`) resolve against it, with the same existence and fragment checks as relative links.
  For a monorepo with several docs projects, `rootDir` also takes a map from source-directory prefix to that directory's site root, and the longest matching prefix wins.
  Paths are relative to the working directory, and absolute links stay skipped when the option is not set.

## 0.5.0

### Minor Changes

- b8b29053f50: Added a baseline: `recheck baseline` records the error findings that exist today as one count per file per rule, and `recheck run` with a `baseline` config key then fails only on new findings, suppresses matched ones, and fails when the baseline goes stale so counts only step down.
- 39767b060b8: Added `crossFile: true` to the `link-fragments` assertion: relative link and image targets must exist on disk, and `file.md#anchor` fragments must exist in the target file.
  Extensionless links resolve like the Realm router (`./page` tries `page.md`; a directory link reads its `index.md`), targets are cached by modification time, and the option is off by default.
- 89302ace3c3: Added `recheck readability`: per-file Flesch reading ease, Flesch-Kincaid grade, Automated Readability Index, words, and sentences, with medians, as a table or JSON.
  It reads the same prose and formulas as the `metric` assertion, so reported scores and gated bounds can never disagree, and it replaces the always-report threshold workaround previously needed to get scores out of a lint run.
- 1d404e664ee: The `semantic-line-breaks` assertion checks list items. It reports bullet or numbered items with two sentences on one line and reflows them with `--fix` to align continuation lines under the list content. Nested pseudo-marker lines (e.g., `- 1. Text`, `- a. Text`) remain excluded.
- 73e4213006c: Added `accordion` and `accordion-group` Markdoc tags to the built-in `realm` schema.

## 0.4.1

### Patch Changes

- 66ea4ea7448: Fixed readability metric scores to match standard readability tools: headings are excluded from the score, and a block with no end punctuation, such as a list item or a table cell, now ends a sentence, so list-heavy pages no longer score far below zero.

## 0.4.0

### Minor Changes

- 34637eddbc0: Added a top-level `excludes` option so a shared ignore list is declared once instead of repeated on every rule, and marked which findings `--fix` can repair with a `[fixable]` tag in the table output and a `fixable` field in JSON output.

### Patch Changes

- 34637eddbc0: Fixed an issue where a period inside a link, as in `See [Step 1. Configure](#step-1) for details.`, was read as the end of a sentence and caused false `semantic-line-breaks` reports.

## 0.3.0

### Minor Changes

- 45993f8f036: Adds `--rule` and `--exclude-rule` to `recheck run`, so you can work through findings one rule at a time instead of facing the whole list at once. Both take the short rule name shown in the report or the full config key, and both can be repeated. A name that matches no rule in your config is an error rather than an empty run.

### Patch Changes

- ddd48125fc2: Fixed five false positives in `capitalization` rules, including incorrect lowercasing of the first word and improper capitalization after inline code. The rule now better distinguishes sentence boundaries, preserving correct casing for version tokens like `v2.0`, vendor extensions such as `x-codeSamples`, and technical terms including `curl`.

## 0.2.0

### Minor Changes

- 888cb06d233: Rebuilt on a new parser, with breaking changes since 0.1.0: config validation is now strict, so rule options that were previously ignored now fail validation. Adds markdownlint-equivalent rules with autofix, prose checks (word swaps, patterns, repetition, capitalization, readability, spelling), ready-made style presets, and opt-in Markdoc tag linting.
