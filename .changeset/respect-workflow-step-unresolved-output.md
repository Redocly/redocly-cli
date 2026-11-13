---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where Respect ran the `onSuccess` actions and the next steps after a step that calls a workflow failed to resolve one of its `outputs`.
The step runs its `onFailure` actions, and the workflow ends when it has none.
