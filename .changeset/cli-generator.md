---
'@redocly/client-generator': minor
'@redocly/cli': minor
---

Added a built-in `cli` generator — `<stem>.cli.ts`, a bin-ready, zero-dependency command-line interface over the generated client: typed flags from query parameters, positional path parameters, `--json` bodies (inline, `@file`, or stdin), credentials from prefixed environment variables, `--dry-run`, `--page-all` pagination streaming, SSE and blob output, a documented exit-code contract, and zod request validation when the `zod` generator is co-selected.
