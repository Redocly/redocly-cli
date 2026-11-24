---
'@redocly/cli': patch
---

Fixed an issue where the `drift` and `proxy` commands skipped the `schema-consistency` rule with the `Maximum call stack size exceeded` warning when a schema had a discriminator with many values.
