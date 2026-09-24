---
'@redocly/cli': patch
---

Fixed an issue where `split` lost content when two components, paths, channels, operations, or code samples got the same file name.

**Warning**: `split` now saves the second of such files with a `-2` suffix, for example `user-2.yaml` next to `User.yaml`.
