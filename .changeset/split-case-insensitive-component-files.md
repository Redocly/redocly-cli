---
'@redocly/cli': patch
---

Fixed an issue where `split` lost content when two components, paths, webhooks, channels, operations, or code samples got the same file name.

**Warning:** `split` output may differ from older releases: when several names would share one file, every later file now gets a numbered suffix (`-2`, `-3`, and so on), for example `user-2.yaml` next to `User.yaml`.
