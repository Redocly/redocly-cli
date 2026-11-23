---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where Respect did not explain why an output of a step that calls a workflow with `workflowId` had no value when it read the request or the response, as in `$response.body` or `$statusCode`.
The step now fails with a message that says it sends no request, the same as for its success criteria.
