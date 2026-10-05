---
'@redocly/client-generator': patch
'@redocly/cli': patch
---

Fixed the generated PHP client to work under OPcache preload. The operation map is now the `Client::OPERATIONS` class constant instead of a file-level constant, which preload does not keep, so client methods no longer fail with `Undefined constant "...\OPERATIONS"` on preloaded requests.
