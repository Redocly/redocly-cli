---
'@redocly/cli': patch
---

Fixed the `drift` command's `schema-consistency` rule reporting false-positive "Undocumented query parameter" findings for `deepObject`-style query parameters. Traffic keys like `namespace[id]=...&namespace[name]=...` are now matched to the documented `namespace` parameter, and the reconstructed object is validated against the parameter schema.
