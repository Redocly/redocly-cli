---
'@redocly/cli': patch
---

Fixed an issue where `join` and `split` folded long YAML strings into several lines and changed multi-line strings from literal style (`|`) to folded style (`>`).
