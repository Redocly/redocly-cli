---
'@redocly/openapi-core': minor
'@redocly/cli': minor
---

Reworked the experimental `tree` command's structure view to walk the original files instead of a bundled copy: every node now reports the file that defines it, `operationId`s survive `$ref`'d path items, and an unresolvable `$ref` is shown as an unresolved node with a warning instead of failing the command.
The graph model moved to `@redocly/openapi-core` as the new `api-graph` module (`buildApiGraph`), reusable outside the CLI.
