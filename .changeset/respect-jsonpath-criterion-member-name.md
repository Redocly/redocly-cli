---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where a `jsonpath` criterion always failed when its condition started with a member name, as in `$.items[?(@.category == "dessert")]`.
Respect now applies such a condition to the `context` value, the same way as a Selector Object.
