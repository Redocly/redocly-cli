---
name: recheck-config
description: Use when you create or tune the recheck block and recheck/* presets in redocly.yaml for a project — choose presets, set severities from measured counts, add exceptions, adopt a baseline, and validate the result.
---

# Configure recheck in redocly.yaml

Configure `redocly recheck` for a project the way its maintainers would: measure first, decide per rule, and record intent.
The documentation is at [redocly.com/docs/cli/recheck](https://redocly.com/docs/cli/recheck); favor it over memory for rule names and options.

## How the configuration is shaped

Presets go in the root `extends`.
Adjustments go in the `recheck` block, with rules nested under `rules`.
The `lint` command ignores both, so they live next to the API ruleset:

```yaml
extends:
  - recommended
  - recheck/markdown
  - recheck/prose
recheck:
  excludes:
    - CHANGELOG.md
  rules:
    recheck/line-length: off
    recheck/no-duplicate-heading:
      severity: warn
      assertions:
        no-duplicate-heading:
          siblingsOnly: true
```

Rules of the shape:

- A rule key is `<namespace>/<name>`: `recheck/line-length`, `google/no-via`, or your own, such as `acme/product-names`.
- A severity string (`off`, `info`, `warn`, `error`) adjusts a rule that a preset defines.
  For a key no preset defines, it is a configuration error, because the rule has no assertions.
- A rule object merges over the preset's rule, but its `assertions` merge by assertion id: one option you set on a `swap` or `pattern` assertion replaces the preset's whole word list.
  To reject one term from a preset's list, turn the rule off, restate the full list, or use an inline directive.
- A new prose rule needs `severity`, `message`, and `assertions`.
  A new Markdown rule, such as `recheck/list-length`, needs only `severity` and `assertions`.
- The block does not accept `extends` or `baseline`; both are configuration errors.
- The command reads the root block only.
  A `recheck` block under `apis.<name>` does nothing and prints a warning.

## Start a new config

1. Begin with the structural preset, and run recheck to validate it:

   ```yaml
   extends:
     - recheck/markdown
   ```

   ```bash
   npx @redocly/cli recheck docs
   npx @redocly/cli check-config
   ```

   The `recheck` command reports configuration errors before it lints anything, and `check-config` validates the block's shape.

2. Add prose presets deliberately, not wholesale.
   `recheck/prose` is a small starter at `warn`.
   `recheck/google` and `recheck/microsoft` are large style guides, detection-only, that need tuning before they help.
   `recheck/plain-language`, `recheck/inclusive-language`, and `recheck/technical-english` compose onto either.

3. If the project writes Markdoc tags, add `recheck/markdoc` to `extends` and `markdoc: true` to the block.
   Without the flag, the Markdoc rules never report.

## Tune severities from measurements, not taste

1. Run the whole document set and count findings per rule:

   ```bash
   npx @redocly/cli recheck docs --summary=json --summary-path=recheck-summary.json
   ```

   The summary's `breakdown` has the count per rule and severity.
   For examples of each rule's findings, run `--rule=<name>` and read a few.

2. Decide per rule from the counts:
   - `error` — enforce now; the document set is clean or you fix it in the same change.
   - `warn` — a worklist; visible, not blocking.
   - `off` — decided against; keep a YAML comment that says why, or the decision is lost.

3. Prefer fixing content over configuring around it.
   Run `--fix` first; most structural findings repair themselves.
   Review the fix list before you commit: fixes that re-indent lines can move content out of an indented Markdoc tag body.

## Exceptions, in order of preference

1. Fix the content.
2. The top-level `excludes` list, or a rule's `excludes` or `appliesTo`, for generated or frozen content such as archives and vendored docs — with a comment naming the reason.
3. `exceptions.lines` for a recurring true positive that must stay as written.
4. An inline `<!-- recheck-disable-next-line rule-name -->` for a single line.

## Adopt strictness on a large document set with a baseline

When the document set has too many errors to fix at once, record them and gate only new ones:

```bash
npx @redocly/cli recheck docs --generate-baseline
```

Commit `.redocly.recheck-baseline.yaml`.
The command writes it next to `redocly.yaml`, and later runs pick it up by presence; there is no configuration key.
It records errors only, as one count per file per rule.

Counts only step down: when findings get fixed, the run reports stale entries, so regenerate the baseline and commit the diff.

## Finish

- `npx @redocly/cli recheck docs` and `npx @redocly/cli check-config` report no configuration errors.
- Every `off` and every exception carries a comment with its reason.
- The project's contributing docs say how contributors run recheck locally, and CI runs it with `--format=github-actions`.
