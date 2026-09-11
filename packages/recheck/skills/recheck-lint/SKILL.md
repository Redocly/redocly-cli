---
name: recheck-lint
description: Use when you write or edit markdown in a project that has a recheck.yaml — run recheck on the touched files before you commit them or hand them over, and fix what it finds.
---

# Lint markdown with recheck before you commit it

This project lints markdown and prose with recheck.
Your markdown must pass it, the same as code must pass its tests.

## When this applies

A `recheck.yaml` (or `recheck.yml`) exists in the project root or above the files you touched.
If none exists, this skill does not apply.

## What to do

1. After you write or edit markdown files, run recheck on them:

   ```bash
   npx recheck <file-or-directory>
   ```

2. If it reports errors, run the auto-fix first — most structural findings repair themselves:

   ```bash
   npx recheck <file-or-directory> --fix
   ```

3. Fix the remaining errors by hand.
   Read each message; the rule name links the finding to its intent.

4. Re-run until it reports no errors, and only then commit or output the content.

## Rules of conduct

- Fix content instead of suppressing findings.
  Suppress only a true positive that must stay as written, with an inline directive on that one line:

  ```markdown
  <!-- recheck-disable-next-line recheck/rule-name -->
  ```

  Never disable a rule project-wide to make your change pass, and never edit `recheck.yaml` to get past a finding.

- Warnings do not block you.
  Leave them unless the task asks for cleanup.
- If the project has a baseline file (a `baseline:` key in `recheck.yaml`), old findings are budgeted; only new findings are yours to fix.
  Do not regenerate the baseline to absorb findings your change introduced.
- A finding you believe is a false positive is worth reporting to the maintainer, not silently suppressing.
