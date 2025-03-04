---
"@redocly/respect-core": patch
"@redocly/cli": patch
---

Fixed step execution to respect severity levels when handling step failures. Previously, steps would always break workflow execution on failure when onFailure is ommited, but now they properly consider the configured severity level (e.g., `warn` | `off` severity allows subsequent steps to execute).
