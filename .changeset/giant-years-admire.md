---
"@redocly/openapi-core": patch
"@redocly/cli": patch
---

Fixed an issue where the `no-http-verbs-in-paths` rule was incorrectly flagging path names containing the verb `query`.
