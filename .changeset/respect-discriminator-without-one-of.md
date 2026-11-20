---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where the Respect schema check failed with the `Ajv error: discriminator: requires oneOf or anyOf composite keyword` message when a response schema had a `discriminator` without `oneOf` or `anyOf`.
Respect now checks such a response against the rest of the schema.
