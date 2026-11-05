---
'@redocly/reunite-integration': patch
'@redocly/cli': patch
---

Fixed an issue where the `push-status` and `push --wait-for-deployment` commands did not show why a deployment to Redocly platform failed.
The error message lists the failed checks, and the command output includes the link checker result.
