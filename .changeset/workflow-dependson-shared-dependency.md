---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed an issue where the `workflow-dependsOn` rule reported a duplicate when different workflows listed the same workflow in `dependsOn`.
