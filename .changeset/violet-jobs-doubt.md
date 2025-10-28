---
"@redocly/cli": patch
---

Fixed an issue where the `mount-path` option was not validated, leading to errors when used with an empty path or a path identical to the project path.
