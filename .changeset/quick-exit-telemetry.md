---
'@redocly/cli': patch
---

Made commands exit faster: the CLI no longer waits for the usage-data request before it exits, because a short-lived background process sends it instead.
Commands also load only the code they need at startup, which cuts startup time.
