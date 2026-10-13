---
'@redocly/client-generator': minor
'@redocly/cli': minor
---

Added the `nextLink` option to the `link` pagination style in the `generate-client` command.
Generated clients use it to read the next page URL from a field in the response.

The `tanstack-query` generator also creates infinite query options for these operations.
