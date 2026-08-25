---
'@redocly/client-generator': patch
'@redocly/cli': patch
---

Removed the incorrect warning that the `python`, `go`, and `php` generators ignore `--runtime`; the module runtime applies to them.
