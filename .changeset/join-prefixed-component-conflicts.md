---
'@redocly/cli': patch
---

Fixed an issue where the `join` command with the `--prefix-components-with-info-prop` option reported a component conflict that did not exist.
The issue occurred when a component name already matched the prefixed name of another component, for example `Item` and `menu_Item` with the `menu` prefix.
**Note:** `join` now reports a conflict when two descriptions with the same prefix define a component with the same name, instead of keeping only the last one.
