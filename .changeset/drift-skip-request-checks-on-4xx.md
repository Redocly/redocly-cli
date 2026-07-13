---
'@redocly/cli': patch
---

Fixed the `drift` command's `schema-consistency` rule reporting false-positive request findings (missing required parameter, missing required body, request-body schema mismatch) for exchanges the server rejected with a `4xx` client error. A `4xx` response means the server never accepted the request, so validating it against the operation's success-path contract flagged the server's own correct rejection as drift. Response-side validation still runs, so a documented error response whose shape differs from reality is still reported.
