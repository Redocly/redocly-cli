---
"@redocly/openapi-core": patch
---

Fixed an issue where JSON Pointers containing special characters (like `%`) were not properly URI-encoded.
When these pointers were used as URI identifiers, they caused validation errors with properties containing percent signs or other special characters.
