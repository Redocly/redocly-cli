---
'@redocly/cli': patch
---

Fixed an issue where the `cursor` AI provider of the `generate-spec` command sent only the instructions to the model and the operation to refine never reached it.
