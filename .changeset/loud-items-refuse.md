---
'@redocly/client-generator': patch
'@redocly/cli': patch
---

Fixed an issue where the `generate-client` command failed when `errorMode: result` was set together with the `tanstack-query` or `swr` generator.
