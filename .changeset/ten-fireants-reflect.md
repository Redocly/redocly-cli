---
"@redocly/openapi-core": patch
---

Process remove-unused-components rule transitively; components are now removed if they were previously referenced by a removed component.
