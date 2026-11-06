---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Added workflow-specific warnings when `respect` inputs do not satisfy their object input schema after merging runtime and environment values.
Execution continues with the mapped inputs, including defaults, type coercion, and removal of additional properties.
Non-object input schemas produce a warning and preserve existing named mappings without validation; use an object schema to validate named inputs.
Input warnings do not trigger failure actions or change the exit code.
