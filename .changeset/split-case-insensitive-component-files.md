---
'@redocly/cli': patch
---

Fixed an issue where `split` lost content when two components, paths, webhooks, channels, operations, or code samples got the same file name.

**Warning:** `split` output may differ from older releases: when two names would share one file, the second file now gets a `-2` suffix, for example `user-2.yaml` next to `User.yaml`.
