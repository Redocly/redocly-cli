---
'@redocly/client-generator': minor
'@redocly/cli': minor
---

Added usage telemetry to the generated Go, Python, and PHP clients: with `client.telemetry: on`, the `go`, `python`, and `php` generators also write a telemetry module next to the client.
Added a settled hook to the generated Go, Python, and PHP clients: `Middleware.OnSettled` in Go, `on_settled` in Python, and `Config->onSettled` in PHP.
