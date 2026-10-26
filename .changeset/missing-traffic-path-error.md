---
'@redocly/cli': patch
---

Fixed the `drift` and `generate-spec` commands crashing with a stack trace when the traffic file or folder does not exist, and the `generate-spec` command when the traffic has no matching HTTP exchanges.
