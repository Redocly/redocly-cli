---
'@redocly/cli': patch
---

Fixed the `push-status --wait` command printing the Reunite API sunset warning twice for pushes to the main branch, and the `push` and `push-status` commands dropping the warning when the deployment failed.
