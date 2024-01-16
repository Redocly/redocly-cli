---
"@redocly/cli": patch
---

- Removed descriptions adding for x-tagGroups for the `join` command. Descriptions in x-tagGroups are not supported and cause errors on linting.
- `info.title` is now used as a name in x-tagGroups instead of a file name for the `join` command to make possible the joining of files with the same names.
