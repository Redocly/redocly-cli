---
"@redocly/openapi-core": patch
"@redocly/cli": patch
---

Add support for data: URLs (RFC 2397) in references.
The resolver now handles inline base64-encoded and URL-encoded data in $ref fields, allowing schemas and other content to be embedded directly as data URLs.
