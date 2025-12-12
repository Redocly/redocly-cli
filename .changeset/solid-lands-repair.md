---
"@redocly/openapi-core": patch
---

Fixed an issue where JSON Pointers containing special characters (like `%`) were not properly URI-encoded when used as URI identifiers, causing validation errors with properties containing percent signs or other special characters.
