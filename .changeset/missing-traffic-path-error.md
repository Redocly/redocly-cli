---
'@redocly/cli': patch
---

Fixednan issue where the `drift` and `generate-spec` commands crashed with a stack trace when the traffic file or folder didn't exist, and the `generate-spec` command when the traffic had no matching HTTP exchanges.
