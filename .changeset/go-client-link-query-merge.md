---
'@redocly/client-generator': patch
'@redocly/cli': patch
---

Fixed an issue where the generated Go client sent a query parameter twice when the next page's link repeated a parameter of the first request.
