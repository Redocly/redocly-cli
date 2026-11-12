---
'@redocly/cli': patch
---

Fixed an issue where the `skills` command failed when the `skills` path of an agent, such as `.claude/skills`, was a file or a broken symbolic link.
The command now skips that path with a warning and installs the skills into the other folders.
