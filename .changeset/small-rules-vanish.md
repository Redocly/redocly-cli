---
"@redocly/openapi-core": patch
"@redocly/cli": patch
---

Fixed false positive errors when validating media type examples. Now, the linter won't error on valid examples that contain references.
