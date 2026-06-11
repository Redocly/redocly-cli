---
'@redocly/respect-core': patch
---

Fixed `respect` schema checks to honor `readOnly` and `writeOnly` based on context.

**Warning:** `writeOnly` properties in responses are reported as errors.
