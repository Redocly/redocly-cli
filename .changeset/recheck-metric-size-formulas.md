---
'@redocly/recheck': minor
'@redocly/cli': minor
---

Added the `word-count`, `sentence-count`, and `reading-time` formulas to the `metric` assertion of `recheck`, for per-file content length and reading-time budgets.
They count what a person reads, leaving out code blocks, front matter, headings, and Markdoc tags, and report once per file.
`reading-time` is minutes at the new `wordsPerMinute` option, default 200.
