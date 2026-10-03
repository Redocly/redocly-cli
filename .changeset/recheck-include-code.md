---
'@redocly/recheck': patch
'@redocly/cli': patch
---

Fixed the `repetition` and `consistency` assertions reporting text inside inline code spans, such as `behaviour` in a table that lists both spellings as code.
Both now skip inline code like `swap` and `pattern` do, and accept `includeCode: true` to scan it again.
