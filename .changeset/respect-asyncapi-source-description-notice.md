---
'@redocly/cli': minor
'@redocly/respect-core': patch
---

Added a notice to `respect` for Arazzo descriptions with an AsyncAPI source description, which the command does not support yet.
A step that uses such a source now fails with a message that says so, instead of `Unknown description name`.
