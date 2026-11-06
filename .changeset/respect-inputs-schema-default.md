---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where `respect` failed when a workflow `inputs` schema had a `default` at its top level or at the top of `env`, or used a keyword that JSON Schema does not define, such as `example` or an `x-` extension.
