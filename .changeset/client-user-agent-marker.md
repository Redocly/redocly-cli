---
'@redocly/cli': minor
'@redocly/reunite-integration': minor
---

Added the `REDOCLY_CLIENT` environment variable that identifies the tool running the `push` and `push-status` commands.
The Reunite API client appends its value to the `user-agent` header, for example `redocly-cli/2.54.2 push redocly-reunite-push-action/v1.4.0`.
