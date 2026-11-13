---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where `respect` counted steps that sent no request, such as the steps skipped after the execution timeout, in `totalRequests` of the JSON output.
