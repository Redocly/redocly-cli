---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where Respect printed a secret path parameter of an `x-operation` URL unmasked in the request URL of the `--verbose` output.
