---
'@redocly/client-generator': minor
'@redocly/cli': minor
---

Added the `nextLink` option to `link`-style pagination in `generate-client`.
The generated clients then follow the URL of the next page from a response field, such as `next_page_url`, instead of the `Link` header, and the `tanstack-query` generator emits `<op>InfiniteOptions` for these operations.
