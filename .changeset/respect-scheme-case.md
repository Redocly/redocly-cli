---
'@redocly/cli': patch
'@redocly/respect-core': patch
'@redocly/openapi-core': patch
---

Fixed `respect` and the `x-security-scheme-required-values` rule rejecting `x-security` HTTP schemes written with non-lowercase casing (such as `Basic`, `Bearer`, or `Digest`) — RFC 7235 scheme names are case-insensitive.
