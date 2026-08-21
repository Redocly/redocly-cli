---
'@redocly/cli': patch
---

Fixed `tree --format=ai` dumping a card's raw source for a description written in JSON: the line range that a card is sliced from leaves JSON brackets open, so parsing failed and the body skipped minifying, prose clipping, and folded error responses. On PayPal's Orders description the three cards a checkout flow needs went from 136 kB to 45 kB.
