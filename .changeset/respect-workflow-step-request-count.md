---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where Respect counted a step that calls a workflow as a request in `totalRequests` of the JSON output when the step reported a failed check of its own.
