---
name: recheck-config
description: Use when you create or tune a recheck.yaml for a project — choose presets, set severities from measured counts, add exceptions, adopt a baseline, and validate the result.
---

# Write and tune recheck.yaml

Configure recheck for a project the way its maintainers would: measure first, decide per rule, and record intent.

## Start a new config

1. Begin with the structural preset and validate:

   ```yaml
   extends:
     - recheck/markdown
   ```

   ```bash
   npx recheck --validate-config
   ```

2. Add prose rules deliberately, not wholesale.
   `recheck/prose` is a small starter; `recheck/google` and `recheck/microsoft` are large style guides that need tuning before they help.

## Tune severities from measurements, not taste

1. Run the whole corpus and count findings per rule:

   ```bash
   npx recheck docs --output json --annotations-limit 5000 --output-path findings.json
   ```

   Group the findings by `ruleName` and look at real examples of each before deciding anything.

2. Decide per rule from the counts:
   - `error` — enforce now; the corpus is clean or you fix it in the same change.
   - `warn` — a worklist; visible, not blocking.
   - `off` — decided against; keep a comment that says why, or the decision is lost.

3. Prefer fixing content over configuring around it.
   Run `--fix` first; most structural findings repair themselves.

## Exceptions, in order of preference

1. Fix the content.
2. `exceptions.files` for generated or frozen content (archives, vendored docs) — with a comment naming the reason.
3. `exceptions.lines` for a recurring true positive that must stay as written.
4. An inline `<!-- recheck-disable-next-line rule-name -->` for a single line.

## Adopt strictness on a large corpus with a baseline

When the corpus has too many errors to fix at once, record them and gate only new ones:

```bash
npx recheck --generate-baseline
```

Commit `recheck-baseline.yaml` and add `baseline: recheck-baseline.yaml` to the config.
Counts only step down: when findings get fixed, regenerate the baseline and commit the diff.

## Finish

- `npx recheck --validate-config` must pass.
- Every `off` and every exception carries a comment with its reason.
- The config's README section or the project docs say how contributors run recheck locally.
