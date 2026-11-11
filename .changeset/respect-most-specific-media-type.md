---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where `respect` checked a response against the first matching wildcard media type instead of the most specific one.
`application/*` wins over `*/*` regardless of their order.
