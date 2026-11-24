---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where Respect failed a step with the `Property time is not expected here` and `Property checks is not expected here` errors when the step called a workflow from an `arazzo` source description that another source description loads too, and a workflow from that file had already run.
