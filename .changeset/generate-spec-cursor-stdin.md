---
'@redocly/cli': patch
---

Fixed the `cursor` AI provider of the `generate-spec` command sending only the instructions to the model: the current Cursor CLI ignores piped stdin when a prompt argument is present, so the operation to refine never reached it.
