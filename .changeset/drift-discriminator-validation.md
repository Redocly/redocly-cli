---
'@redocly/cli': patch
---

Fixed an issue where the `drift` command's `schema-consistency` rule reported false-positive findings for `oneOf` schemas with a `discriminator`.
Payloads are validated only against the branch selected by the discriminator value instead of every `oneOf` branch.
Schemas whose discriminator does not meet Ajv's structural requirements keep the previous behavior.
