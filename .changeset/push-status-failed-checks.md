---
'@redocly/reunite-integration': patch
'@redocly/cli': patch
---

Fixed `push-status` and `push --wait-for-deployment` not showing why a deployment failed: the output now includes the link checker result, and the error lists the failed checks.
