---
name: pr
description: Open a draft pull request in the Redocly CLI repository from the current branch — commit only the files of the change, add a changeset, and fill the PR template without removing any of its sections. Use whenever the user asks to open, create, or prepare a PR or draft PR, push work for review, or ship a change, even if they do not say "draft".
---

# Open a draft pull request

Redocly CLI is a public repository.
The branch name, commits, PR title, and PR body are public, and a reviewer reads every line.

This skill publishes the user's work.
It does not change code: the only file it may create is a changeset.

## 1. Understand the change

1. Run `git fetch origin main`, then read `git status --short`, `git diff`, and `git diff origin/main...HEAD`.
   The change is the commits on the branch plus the uncommitted files.
2. Find the why in the conversation, the commits, or the linked issue.
   If no source says why, ask the user before you write the PR body.
3. List the files that belong to the change.
   Leave out everything else: untracked drafts, local notes and plans, and a `package-lock.json` that only a local `npm install` changed.
   When you are not sure that a file belongs, ask.

## 2. Check the branch

Open the PR from the branch that the user is on.
It usually holds the work already, and a switch to another branch leaves its commits behind.

- If the current branch is `main`, create a branch from the current state, so the local commits and uncommitted files come with it:

  ```bash
  git switch -c <type>/<short-topic>
  ```

  Name it after the commit type and the topic, for example `fix/bundle-ref-paths`.
  Never push `main`.

- Do not rebase, merge, reset, or stash without asking.
  If `git rev-list --count HEAD..origin/main` is large, tell the user that `main` has moved on.

## 3. Check the change

Run these from the repository root:

```bash
npm run compile      # tests import the compiled lib/ output
npm run lint
npm run typecheck
npm test
```

- For a change to docs only, `npm run lint` and `npx redocly recheck <changed files> --config docs/redocly.yaml` are enough.
- If the diff came from an AI assistant, run `/deslop` before you commit.
- If a check fails because of the change, stop and report the failure.
  If it fails for an unrelated reason, such as a flaky test or a missing local tool, record it with its output in the Testing section.
  Never hide a failure.

## 4. Add a changeset

Every feat or fix that changes a published package needs a changeset (see `CONTRIBUTING.md` and `.claude/rules/workflow.md`).

1. Read the package names in `.changeset/config.json`, and read the top of the package `CHANGELOG.md` to match its wording.
2. Write `.changeset/<three-random-words>.md`:

   ```md
   ---
   '@redocly/cli': minor
   ---

   Added the `skills` command that installs the Redocly CLI agent skills for AI coding agents.
   ```

- List only the packages whose behavior changed for users.
  If the code is in another package, such as `@redocly/openapi-core`, but it changes CLI behavior, list `@redocly/cli` too.
- Write one sentence in the past tense from the user's point of view: "Added …", "Fixed … so that …".
  If the change can break an existing flow, add a short **Note**.
- Changes to docs, tests, CI, or AI instructions need no changeset.
  The PR then gets the `no changeset needed` label (step 7).

## 5. Commit

- Stage each file by its path: `git add <path> <path>`.
  Do not use `git add .`, `git add -A`, or a folder path.
  They also stage untracked drafts, and a draft stays in the public history even after you remove it.
- After staging, compare `git diff --cached --name-only` with the file list from step 1.
- Write one Conventional Commits sentence, such as `feat: add the skills command` or `fix(respect): keep cookies between steps`.
  The types in use are `feat`, `fix`, `docs`, `chore`, and `test`.
  The scope is optional.
- Do not add AI co-author or "Generated with" lines.
- The pre-commit hook lints and formats the staged files.
  If it fails, fix the cause.
  Do not use `--no-verify`.

## 6. Write the PR body

Copy `.github/pull_request_template.md` to a temporary file, for example `$TMPDIR/pr-body.md`, and fill it in.
Write the file with your file-writing tool instead of `echo` or a heredoc, so backticks and quotes stay intact.

Keep the template whole.
Keep every header, every checkbox, and every `<!-- required 🔒 -->` comment.
Keep `## Screenshots (optional)` even when it stays empty.
`CONTRIBUTING.md` says: "Please do not modify the PR template."

- **What/Why/How?**
  The reader knows Redocly CLI but has not read this code.
  Keep the section short:
  - One or two sentences on why: the problem and its effect on users.
  - One or two sentences on what changes, at the level of commands, options, rules, and output.
  - Up to five bullets on how the parts work together, the decisions, and the risks.
  - Do not list the changes file by file.
    The diff shows them.
- **Reference**: public links only, such as a GitHub issue or a related PR.
  Leave it empty when there is none.
- **Testing**: one line for each check, with the command or manual step and its result.
  If you proved that a new test can fail, say how.
- **Screenshots (optional)**: keep the header.
  For a change to CLI output, tell the user that a screenshot helps the reviewer.
  Add images only when the user gives them.
- **Check yourself** and **Security**: check a box only when it is true for this PR.
  Leave the other boxes unchecked.
  Do not delete any box.

The repository is public, so keep internal context out of the title, body, and commits.
When the user tells you such context, use it to understand the why.
Then write the why as what users get.

Write plain English: short sentences, active voice, no filler, and no marketing tone.

## 7. Push and open the draft PR

```bash
git push -u origin HEAD
gh pr create --draft --base main --title "<title>" --body-file "$TMPDIR/pr-body.md"
```

- Use the main commit sentence as the title.
- Add `--label "no changeset needed"` when step 4 found that no changeset is needed.
- Open a ready (non-draft) PR only when the user asks for it.
- Delete the temporary body file.
- Give the user the PR URL and the list of committed files.
  Name anything that you left out on purpose, such as untracked files or an unrelated failing check.

## Update an open PR

The user often edits the PR body on GitHub, for example to add screenshots.
Before you change the body, read the current version with `gh pr view <number> --json body`, and change only the part that must change, so that their edits stay.
