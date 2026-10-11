---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed an issue where file paths in a config file included with `$ref` were resolved against the root `redocly.yaml` instead of the file they are written in.
This applies to the `root`, `output`, `overlays`, and `clientOutput` options of an API, `openapi.htmlTemplate`, `client.cliOutput`, `client.setup`, and `recheck.markdoc.extend.tagsFile`.
