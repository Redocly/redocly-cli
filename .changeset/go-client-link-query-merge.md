---
'@redocly/client-generator': patch
'@redocly/cli': patch
---

Fixed an issue where the generated Go client sent duplicate query parameters when it followed a next page link.
