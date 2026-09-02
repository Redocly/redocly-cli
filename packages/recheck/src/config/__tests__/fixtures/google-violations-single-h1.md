# First top-level heading

`google/single-h1` and `google/first-line-h1` both come from the same
Google statement ("only use a level-1 heading once on a page") but check
opposite conditions of the SAME "first heading in the document" state:
`single-h1` only fires when nothing but comments/frontmatter precede the
first level-1 heading, while `first-line-h1` only fires when the first
real content is *not* a correct level-1 heading. A single document can
satisfy at most one of those two preconditions, so this repo's
`google-violations.md` (which deliberately starts with a level-2 heading
to trigger `first-line-h1`) can never also trigger `single-h1`. This tiny,
separate fixture isolates `single-h1` instead: a clean, correct first
heading, followed by a second one below.

# Second top-level heading

A second level-1 heading violates `google/single-h1`.
