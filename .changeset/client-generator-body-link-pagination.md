---
'@redocly/client-generator': minor
'@redocly/cli': minor
---

Added the `body-link` pagination style to the `generate-client` command.
Generated clients use it to follow the next page URL from a field in the response, set with the `nextLink` option.

The `tanstack-query` generator also creates infinite query options for these operations.
