---
"@redocly/openapi-core": patch
"@redocly/cli": patch
---

Fixed a bug where running a preview command when Realm is not in the `node_modules` of the project failed because one of it's dependencies could not be resolved.
