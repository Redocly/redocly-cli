---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where Respect read a runtime expression as plain text when a JSON Pointer or the name of a query or path parameter had a character such as `@`, `:`, or `$`, as in `$response.body#/@odata.nextLink` or `$request.query.$filter`.
Respect evaluates such an expression when it is the whole value, the `context` of a criterion or a selector, or an expression embedded in curly braces.
