---
'@redocly/recheck': patch
'@redocly/cli': patch
---

Fixed the default `frontMatterTitle` pattern of the `single-h1`, `first-line-h1`, and `heading-increment` rules so that only a top-level `title` key in the front matter counts as the document title.
A nested key such as `seo.title` no longer makes `single-h1` report the page's real h1 as a second top-level heading.
