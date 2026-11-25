---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where the Respect schema check failed with the `must have required property` message when a response did not have a required property that is marked `writeOnly` through `allOf`.
