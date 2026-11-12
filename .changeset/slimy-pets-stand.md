---
'@redocly/cli': minor
---

Added support for git revisions to the experimental `diff` command.
An argument in the `<revision>:<path>` form, such as `origin/main:openapi.yaml`, reads the API description and the files it references from that revision.
