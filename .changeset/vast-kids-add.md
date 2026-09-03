---
'@redocly/cli': minor
'@redocly/openapi-core': minor
---

Added a `strategy` option to the `component-name-unique` rule, matching the `--component-names-strategy` option of the `bundle` command.
Set it to `title` to check the component names that bundling derives from each schema's `title`.
With `strategy: title`, the rule also reports referenced schemas that have no `title`, because `bundle` can't name those and fails.
