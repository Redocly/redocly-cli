---
'@redocly/cli': patch
---

Extended the `drift` command's built-in undocumented-header ignore list with well-known infrastructure headers: the `x-amzn-` (AWS load balancer and API Gateway) and `x-github-` (GitHub webhook delivery metadata) prefixes, and the `x-hub-signature` / `x-hub-signature-256` webhook signature headers.
