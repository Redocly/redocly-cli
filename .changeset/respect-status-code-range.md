---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where `respect` failed the status code check and skipped the content type and schema checks for a response described with a status code range, such as `2XX`.
