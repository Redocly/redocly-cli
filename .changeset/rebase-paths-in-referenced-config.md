---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed an issue where relative file paths in a config file included with `$ref` were resolved against the root `redocly.yaml` instead of the file they are written in.
Glob options such as `ignore` are rebased the same way, except patterns that start with `/` or `**`. So are the paths in `srcSet` lists and icon options that name an image file.
The entries of `catalog` and `catalogClassic` are now checked by the config linter like other config options.
