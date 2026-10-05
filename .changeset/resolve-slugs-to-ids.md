---
'@redocly/cli': minor
'@redocly/reunite-integration': minor
---

Resolved organization and project slugs to IDs in the `push` and `push-status` commands before calling the Reunite API, with a deprecation notice that shows the IDs to use.
The `--organization` and `--project` options now expect the IDs from the organization and project settings pages in Reunite; slugs are still accepted but deprecated.
