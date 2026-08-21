---
'@redocly/cli': patch
'@redocly/openapi-core': patch
---

Fixed `tree` reading a referenced file's own top-level `servers:` or `security:` as the API's root list: a multi-file description whose operation files carry their own server overrides no longer shows the last file's values in the overview.
