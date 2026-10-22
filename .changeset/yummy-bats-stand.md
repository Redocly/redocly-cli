---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where `respect` ran workflows with inputs that did not satisfy their input schema.
Inputs are validated after merging runtime and environment values, before the workflow's operation requests.
Invalid inputs for a selected workflow also prevent its dependencies from starting.

**Note:** Workflows with missing required inputs or invalid input values now fail instead of sending requests with those values.
