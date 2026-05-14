---
"@redocly/cli": patch
---

Fixed a hard crash in `build-docs`, `stats`, and `score` when no API was provided either via the command argument or in the config. These commands — along with `bundle`, which previously exited silently with no output — now exit with a clear, consistent error message pointing the user to the missing input.
