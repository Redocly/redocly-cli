---
'@redocly/openapi-core': minor
'@redocly/cli': minor
---

Added the `no-ambiguous-component-names` rule that reports component names in the same `components` section that differ only in letter case or in the `-`, `_`, and `.` characters, such as `MenuItem` and `menu_item`.
The rule is enabled at the `warn` level in the `recommended` ruleset.

**Note**: linting output may include new warnings for API descriptions that contain such component names.
