---
'@redocly/cli': patch
---

Fixed `drift` and `coverage` failing to match a path template whose segment mixes literal text with parameters, such as `/instances/{worldId}:{instanceId}`.
