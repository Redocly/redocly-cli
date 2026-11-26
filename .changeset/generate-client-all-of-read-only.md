---
'@redocly/client-generator': patch
'@redocly/cli': patch
---

Fixed an issue where the `generate-client` command kept the `readOnly` properties in a request body, and the `writeOnly` properties in a response, when an `allOf` was written directly in that body or response.
