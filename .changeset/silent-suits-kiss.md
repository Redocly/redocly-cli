---
"@redocly/respect-core": minor
"@redocly/cli": minor
---

Add global execution timeout timer to `respect` command execution in order to prevent infinite test runs. The timer can be configured using the `RESPECT_TIMEOUT` environment variable (defaults to 1 hour).
