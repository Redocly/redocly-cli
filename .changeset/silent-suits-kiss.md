---
"@redocly/respect-core": minor
"@redocly/cli": minor
---

Added global execution timeout timer to `respect` command execution to prevent infinite test runs. You can configure this timer using the `RESPECT_TIMEOUT` environment variable (defaults to 1 hour).
