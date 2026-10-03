---
'@redocly/cli': patch
'@redocly/recheck': patch
---

Fixed the `recheck/no-multiple-space-blockquote` rule so that an indented code block inside a blockquote is no longer reported when Markdoc parsing is on, matching markdownlint's MD027.
