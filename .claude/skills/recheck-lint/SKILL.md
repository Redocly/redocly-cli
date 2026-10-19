---
name: recheck-lint
description: Use when you write or edit Markdown in a project whose redocly.yaml has a recheck block or a recheck/* preset in extends — run redocly recheck on the touched files before you commit them or hand them over, and fix what it finds.
---

# Lint Markdown with recheck before you commit it

This project lints Markdown structure and prose with `redocly recheck`.
Your Markdown must pass it, the same as code must pass its tests.

## When this applies

Look for a `redocly.yaml` in the project root or above the files you touched.
This skill applies when that file has a `recheck` block, or a `recheck/*` preset in its root `extends`, for example:

```yaml
extends:
  - recommended
  - recheck/markdown
recheck:
  rules:
    recheck/line-length: off
```

If neither exists, skip this skill.
The command checks nothing in that case and says so.

## What to do

1. After you write or edit Markdown files, run recheck on them:

   ```bash
   npx @redocly/cli recheck <file-or-directory>
   ```

   Pass the files you touched, not the whole repository, so the report is yours to act on.

2. If it reports errors, run the auto-fix first — most structural findings repair themselves:

   ```bash
   npx @redocly/cli recheck <file-or-directory> --fix
   ```

   The command lists every edit it made.
   Read the list: a fix inside a Markdoc tag body or a code sample deserves a look.

3. Fix the remaining errors by hand.
   Read each message; the rule name links the finding to its intent.
   To see one rule at a time, add `--rule=<name>` with the name the report prints.

4. Re-run until it reports no errors, and only then commit or output the content.
   The command exits with code 1 while errors remain.

## Rules of conduct

- Fix content instead of suppressing findings.
  Suppress only a true positive that must stay as written, with an inline directive on that one line:

  ```markdown
  <!-- recheck-disable-next-line recheck/rule-name -->
  ```

  Name the rule by its full key or by the short name the report prints.
  Never disable a rule project-wide to make your change pass, and never edit the `recheck` block to get past a finding.

- Warnings and info findings do not block you.
  Leave them unless the task asks for cleanup.
- If a `.redocly.recheck-baseline.yaml` file sits next to `redocly.yaml`, the baseline already covers old findings; only new findings are yours to fix.
  Do not run `--generate-baseline` to absorb findings your change introduced.
  If your change removed old findings, the run reports stale baseline entries; regenerate the baseline then, and commit the smaller file with your change.
- A finding you believe is a false positive is worth reporting to the maintainer, not silently suppressing.
- Do not add `markdownlint` or `vale` comments.
  Recheck does not read them.
