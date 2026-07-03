# Testing and QA

1. Cover every feature or fix with tests — unit or e2e, depending on the task. One focused,
   clear test that exercises the behavior is enough; don't add tests just to have them.
2. Compile before testing. Unit tests import from `lib/` (compiled output), not `src/` — run
   `npm run compile` after every change.
3. Rule unit tests parse a YAML document, run `lintDocument`, and assert with
   `toMatchInlineSnapshot` so the whole output stays visible. Generate new snapshots and
   update stale ones as part of the change.
4. Run the full suite (`npm test`) when you touch core linting logic.
5. Keep coverage above the thresholds configured in `vitest.config.ts`, and make sure all
   tests pass in CI.

## Docs and output

6. Update the docs for every new or changed rule, decorator, option, or command — a feature
   without docs is incomplete. Write them in Markdown.
7. Keep user-facing output (logs, messages, errors) clear, non-technical, and actionable.
