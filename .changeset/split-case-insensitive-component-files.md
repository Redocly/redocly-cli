---
'@redocly/cli': patch
---

Fixed an issue where `split` lost a component on a case-insensitive file system when two component names differed only by case; the second file now gets a `-2` suffix.
