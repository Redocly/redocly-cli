---
'@redocly/client-generator': patch
'@redocly/cli': patch
---

Fixed an issue where the generated PHP client threw a `TypeError` on a response with a value of a `oneOf` or `anyOf` without a discriminator, when a member of the union was an object, an enum, or a date.
Such a value is now typed as the decoded JSON: `array` for an object, the backing `string` or `int` for an enum, and `string` for a date.

**Note:** Pass an array, a string, or an int in place of a model instance or an enum case for such a value in a request.
