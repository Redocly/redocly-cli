---
'@redocly/cli': minor
---

Added the `tree` command that displays the structure of an API description — paths, operations, and their component dependency chains — as `stylish` (tree), `json`, or `mermaid` output. The `--affected-by` option filters the tree to what is impacted by a change to a component, path, or file, and `--files` switches to the file-level `$ref` graph.
