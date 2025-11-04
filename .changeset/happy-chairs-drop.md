---
"@redocly/openapi-core": patch
---

Fixed an issue where the `remove-unused-compoents` decorator threw a `Can't resolve $ref` error. This issue occurred when `components.parameters` had a $ref to `components.schemas`.
