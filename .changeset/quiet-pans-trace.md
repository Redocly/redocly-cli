---
'@redocly/cli': patch
---

Fixed the `build-docs` command hiding the stack trace of unexpected errors while prerendering, such as `TypeError: u?.match is not a function`. A template file that cannot be read is still reported with a short message.
