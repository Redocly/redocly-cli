---
'@redocly/client-generator': patch
---

Fixed the generated CLI reporting response-validation drift under `--dry-run`, where the only response is the dry-run stub; request validation still runs.
