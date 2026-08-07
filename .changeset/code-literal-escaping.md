---
'@redocly/client-generator': patch
---

Fixed string escaping in generated code: a value containing a quote or a newline was double-escaped, which ended the string early and produced TypeScript that did not parse.
