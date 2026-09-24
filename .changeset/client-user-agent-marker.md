---
'@redocly/cli': patch
'@redocly/reunite-integration': patch
---

Added the value of the `REDOCLY_ENVIRONMENT` environment variable to the `user-agent` header of the `login`, `push`, and `push-status` requests, for example `redocly-cli/2.54.2 push redocly-reunite-push-action/v1.4.0`.
