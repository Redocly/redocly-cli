---
name: pr
description: Open a draft pull request in the Redocly CLI repository from a branch without a PR, or a new branch from main — commit the staged files, or the files of the change when nothing is staged, check the changeset, and fill the PR template without removing any of its sections. Use whenever the user asks to open, create, or prepare a PR or draft PR, push work for review, or ship a change, even if they do not say "draft".
---

# Open a draft pull request

Redocly CLI is a public repository.
The branch name, commits, PR title, and PR body are public, and a reviewer reads every line.

This skill publishes the user's work.
It does not change code: the only file it may create is a changeset.

## 1. Understand the change

1. Run `git fetch origin main`, then read `git status --short`, `git diff --cached`, and `git diff`.
   The change is the uncommitted files, plus the commits of the current branch when step 2 uses that branch.
2. When the user staged files, they chose the files of the change, so the change is the staged files.
   When an unstaged or untracked file seems to belong to it, ask the user to stage it before you go on.
3. When nothing is staged, list the files that belong to the change, and step 5 stages them.
   Leave out everything else: untracked drafts, local notes and plans, and a `package-lock.json` that only a local `npm install` changed.
   When you are not sure that a file belongs, ask.
4. Find the why in the conversation, the commits, or the linked issue.
   If no source says why, ask the user before you write the PR body.

## 2. Choose the branch

Use the current branch when it is not `main` and has no PR yet (`gh pr list --head <branch> --state all` is empty).
The user created it for this change, so its commits belong to the PR: read them with `git log origin/main..HEAD` and `git diff origin/main...HEAD`.

Otherwise, create the PR branch from `origin/main`, unless the user asks for another base:

```bash
git switch -c <type>/<short-topic> origin/main
```

The uncommitted files come with the switch, and the commits of the current branch stay out of the PR.
Name the branch after the commit type and the topic, for example `fix/bundle-ref-paths`.
Never push `main`.

- If git refuses the switch because an uncommitted file conflicts with `origin/main`, stop and ask.
- Do not rebase, merge, reset, or stash without asking.

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
  When the user staged the files, ask them to review its edits and stage the edited files.
- If a check fails because of the change, stop and report the failure.
  If it fails for an unrelated reason, such as a flaky test or a missing local tool, report it to the user with its output.
  Never hide a failure, but keep it out of the PR body: the pipelines show it, and every check must pass before the merge.

## 4. Add a changeset

Every feat or fix that changes a published package needs a changeset (see `CONTRIBUTING.md` and `.claude/rules/workflow.md`).

When the change needs a changeset and none exists, write one.
It is a file of the change: when the user staged the files, ask them to stage it too, and otherwise step 5 stages it.

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

- When the user staged the files, commit them and stage nothing else.
- Otherwise, stage each file of the change by its path: `git add <path> <path>`.
  Do not use `git add .`, `git add -A`, or a folder path.
  They also stage untracked drafts, and a draft stays in the public history even after you remove it.
- Before you commit, compare `git diff --cached --name-only` with the files of the change from step 1.
- Write one Conventional Commits sentence, such as `feat: add the skills command` or `fix(respect): keep cookies between steps`.
  The types in use are `feat`, `fix`, `docs`, `chore`, and `test`.
  The scope is optional.
- Do not add AI co-author or "Generated with" lines.
- The pre-commit hook lints and formats the staged files.
  If it fails, fix the cause, then stage the fixed file again when you staged it, and otherwise ask the user to review and stage it.
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
  Describe the changes, and keep the section short:
  - One sentence on what changes, at the level of commands, options, rules, and output, and why users need it.
  - A bullet only for a major decision that the code does not show.
    A decision that follows the existing approach is obvious, so it stays out.
  - Leave out the background, such as how other commands already work, and what the reader can read in the code, such as the details of the implementation.
- **Reference**: public links only, such as a GitHub issue or a related PR.
  Leave it empty when there is none.
  Each related link goes in this section.
- **Testing**: one line that lists the kinds of tests applied, such as local, unit, e2e, smoke, or performance, for example "Locally, E2E tests.".
  Describe the procedure only when it is specific to the change, such as a manual check that no test covers.
  The section describes what was done, so it carries no results and no failures.
- **Screenshots (optional)**: keep the header.
  For a change to CLI output, tell the user that a screenshot helps the reviewer.
  Add images only when the user gives them.
- **Check yourself** and **Security**: check a box only when it is true for this PR.
  A box about code, such as "All new/updated code is covered by tests" or "Code follows company security practices and guidelines", stays unchecked when the PR changes no code.
  Leave the other boxes unchecked.
  Do not delete any box.

The repository is public, so keep internal context out of the title, body, and commits.
When the user tells you such context, use it to understand the why.
Then write the why as what users get.

Write plain English: short sentences, active voice, no filler, and no marketing tone.
Say each thing once in the whole body.

## 7. Push and open the draft PR

```bash
git push -u origin HEAD
gh pr create --draft --base main --title "<title>" --body-file "$TMPDIR/pr-body.md"
```

- Use the main commit sentence as the title.
- Add `--label "no changeset needed"` when step 4 found that no changeset is needed.
- When the author is a member of the Redocly organization (`gh api orgs/Redocly/members/$(gh api user --jq .login)` returns `204`), add `--assignee @me --project "Dark Side Board"`.
- Always open a draft PR.
- Delete the temporary body file.
- Give the user the PR URL and the list of committed files.
  Name anything that you left out on purpose, such as untracked files or an unrelated failing check.

## Update an open PR

The user often edits the PR body on GitHub, for example to add screenshots.
Before you change the body, read the current version with `gh pr view <number> --json body`, and change only the part that must change, so that their edits stay.
