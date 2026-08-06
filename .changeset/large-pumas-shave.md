---
'@redocly/cli': patch
---

Reduced CLI startup time by about 20% on Node 22.8 and later by reusing Node's on-disk compile cache.
Set `NODE_DISABLE_COMPILE_CACHE=1` to turn it off.
