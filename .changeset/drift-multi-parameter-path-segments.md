---
'@redocly/cli': patch
---

Fixed `drift` and `coverage` failing to match a path template whose segment mixes literal text with parameters, such as `/instances/{worldId}:{instanceId}`.
Only a segment that was entirely one parameter was recognized, so these templates were compiled as literal text and never matched any request.
Affected requests were reported as undocumented by `drift` and left out of the `coverage` figures.
