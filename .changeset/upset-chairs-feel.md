---
"@redocly/cli": patch
---

Fixed issue wherein `redocly respect` did not honor `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY` environment variables when loading remote source descriptions or external `$ref`s. This extends the same behavior to ref resolution.
