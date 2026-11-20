---
'@redocly/client-generator': minor
'@redocly/cli': minor
---

Updated the `zod` client generator to emit `z.discriminatedUnion` for unions with a discriminator whose mapping covers every member, when each member declares the discriminator as a required literal or enum. Validation errors now name the failing field of the selected branch.

**Note:** the generated zod module now requires zod 4.
