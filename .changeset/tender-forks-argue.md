---
"@redocly/openapi-core": patch
"@redocly/cli": patch
---

Fixed an issue where running the `preview` command failed because one of its dependencies could not be resolved.
The issue occurred when Realm was not installed in the `node_modules` of the project.
