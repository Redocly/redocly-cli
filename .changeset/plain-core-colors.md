---
'@redocly/openapi-core': minor
---

Removed the `color` option of `formatProblems`, which switched colors on or off for the whole process.
The output now follows the terminal detection, so set `FORCE_COLOR` or `NO_COLOR` to override it.
`getCodeframe` colors a frame only when the terminal supports colors, and marks the spot with an underline otherwise.
