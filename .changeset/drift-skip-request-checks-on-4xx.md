---
'@redocly/cli': patch
---

Fixed an issue where the `drift` command's `schema-consistency` rule reported false-positive request findings for exchanges the server rejected with a `4xx` client error.
For example: missing required parameter, missing required body, request-body schema mismatch.
A `4xx` response means the server never accepted the request.
Validating it against the operation's success-path contract flagged the server's own correct rejection as drift.
Response-side validation still runs, so a documented error response whose shape differs from reality is still reported.
