---
"@redocly/openapi-core": patch
"@redocly/cli": patch
---

Fixed an issue with the `remove-x-internal` decorator where bundling API descirptions containing discriminators could fail when using **Node.js** v17 or earlier.
