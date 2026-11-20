---
'@redocly/client-generator': minor
'@redocly/cli': minor
---

Updated the `zod` client generator to emit `z.discriminatedUnion` for unions with a discriminator whose mapping covers every member. Validation errors now name the failing field of the selected branch.

**Note:** the generated zod module now requires zod 4.
