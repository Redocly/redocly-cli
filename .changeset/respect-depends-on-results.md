---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where Respect left the runs of the workflows from a `dependsOn` list out of the results.
Their requests, steps, and checks now count in the summary and in `totalRequests` of the JSON output, and the JSON output lists each run in the `executedSteps` of the workflow that depends on it.
