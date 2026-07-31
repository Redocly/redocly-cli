---
'@redocly/client-generator': patch
---

Fixed request bodies to be sent with the operation's declared content type (for example `application/merge-patch+json`) instead of always `application/json`, and pagination pointers (`items`, `nextCursor`, `hasMore`) to resolve through `allOf` response schemas, so collection schemas composed from a shared base no longer need flattening.
