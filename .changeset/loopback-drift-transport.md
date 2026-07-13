---
'@redocly/cli': patch
---

Fixed the `drift` command's `security-baseline` rule reporting false-positive "credential exposure over insecure HTTP transport" warnings for traffic captured against loopback hosts (`localhost`, `*.localhost`, `127.0.0.0/8`, `[::1]`). Loopback traffic never leaves the machine, matching the W3C Secure Contexts definition of trustworthy origins, so sandboxed recordings — for example from `redocly proxy` in front of a local target during e2e runs — no longer produce transport warnings.
