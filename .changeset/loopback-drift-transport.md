---
'@redocly/cli': patch
---

Fixed an issue where the `drift` command's `security-baseline` rule reported false-positive "credential exposure over insecure HTTP transport" warnings for traffic captured against loopback hosts, for example: `localhost`, `*.localhost`, `127.0.0.0/8`, `[::1]`.
Sandboxed recordings no longer produce transport warnings.
