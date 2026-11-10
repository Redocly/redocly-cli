---
'@redocly/cli': patch
'@redocly/respect-core': patch
---

Fixed an issue where a Respect step that uses an AsyncAPI source description failed with `Unknown description name`.
The step now reports that Respect does not support AsyncAPI yet and links the Redocly CLI repository to upvote or open an issue.
