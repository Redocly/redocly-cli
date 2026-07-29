---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Added support for the Arazzo spec-compliant workflow reference form `$sourceDescriptions.<name>.<workflowId>` in `dependsOn`, step `workflowId`, and success/failure action `workflowId`.

Unresolvable workflow references fail only the affected workflow with a clear error message, and no longer abort the whole run or pass unnoticed.
