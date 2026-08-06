---
'@redocly/cli': patch
---

Reduced CLI startup time on Node 22.8 and later reusing Node's on-disk compile cache.
Set `NODE_DISABLE_COMPILE_CACHE=1` to turn it off.
