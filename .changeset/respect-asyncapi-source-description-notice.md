---
'@redocly/cli': patch
'@redocly/respect-core': patch
---

Fixed the error for a `respect` step that uses an AsyncAPI source description, which the command does not support yet.
The step now says so and links the Redocly CLI repository to upvote or open an issue, instead of failing with `Unknown description name`.
The other workflows in the file still run.
