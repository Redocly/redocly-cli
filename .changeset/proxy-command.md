---
'@redocly/cli': minor
---

Added an experimental `proxy` command that captures live HTTP traffic through a reverse proxy into a HAR file and optionally validates it against an OpenAPI description in real time. The captured HAR file can be replayed through the `drift` command.
