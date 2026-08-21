---
'@redocly/cli': minor
---

Shortened what `tree --format=ai` prints inside a card body: prose longer than 600 characters on the operation or component itself, and longer than 120 on a field inside it, now keeps whole sentences up to that length and ends in `…`, while error responses fold to an `errors` list of the status codes. The response components stay in `--- deps`, and every line range still points at the full text in the source.
