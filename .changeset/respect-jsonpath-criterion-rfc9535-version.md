---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where Respect ignored the `rfc9535` version of a `jsonpath` criterion.
A criterion with `type: { type: jsonpath, version: rfc9535 }` queries its `context` value the same way as a Selector Object, so `$[?(@.category == "dessert")]` filters the items of a list.
