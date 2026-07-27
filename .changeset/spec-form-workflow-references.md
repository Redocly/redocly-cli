---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Added support for the Arazzo spec-compliant workflow reference form `$sourceDescriptions.<name>.<workflowId>` in `dependsOn`, step `workflowId`, and success/failure action `workflowId`. Unresolvable workflow references now fail the affected workflow with a clear error message instead of aborting the whole run or being silently ignored.
