---
'@redocly/client-generator': patch
---

Fixed the Go SDK emitting two blank comment lines where a description has consecutive blank lines, which left the output not gofmt-clean.
