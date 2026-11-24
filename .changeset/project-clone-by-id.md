---
'@redocly/platform-integration': patch
'@redocly/cli': patch
---

Updated the `project clone` command to address the project by its organization and project IDs in the Git remote URL, also when the project is given by slugs.
Updated the `project pr create` and `project pr status` commands to call the Redocly platform API by IDs, and to show the Git command that switches a clone made with slugs to IDs.
