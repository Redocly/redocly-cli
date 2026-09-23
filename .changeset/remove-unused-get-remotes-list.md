---
'@redocly/reunite-integration': minor
---

Removed the `getRemotesList()` method from the Reunite API client (`ReuniteApi.remotes`), together with the `ListRemotesResponse` and `Remote` types.
The method was never used by Redocly CLI, and its response type no longer matches the Reunite API, which returns list results in `data` instead of `items`.

**Note**: `getRemotesList()`, `ListRemotesResponse`, and `Remote` are no longer exported from `@redocly/reunite-integration`.
