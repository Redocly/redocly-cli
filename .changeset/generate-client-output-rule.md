---
'@redocly/cli': patch
---

Changed the experimental `generate-client` command to resolve the output path as `bundle` does: the `clientOutput` of an API wins over `--output`, with a warning, a file path does not read `clientOutput`, and `--output` works without an API when one API has no `clientOutput`.

**Note**: when you pass `--output` for an API that has `clientOutput`, remove `clientOutput` or pass the file path of the API description instead of its alias.
