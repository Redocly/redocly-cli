---
'@redocly/cli': patch
'@redocly/respect-core': patch
'@redocly/openapi-core': patch
---

Fixed an issue where `respect` and the `x-security-scheme-required-values` rule incorrectly rejected `x-security` HTTP schemes written with non-lowercase casing (such as `Basic`, `Bearer`, or `Digest`).
RFC 7235 scheme names are case-insensitive.
