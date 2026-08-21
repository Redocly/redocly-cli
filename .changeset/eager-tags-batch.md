---
'@redocly/cli': minor
---

`tree --tag=<name> --with-deps` now returns every operation of that tag as a card, followed by one dependency closure covering all of them, instead of rejecting the combination. Assembling a flow no longer costs a request per operation, and a schema several operations share arrives once rather than once per card: on the Cafe demo description the six `Orders` operations are 11,792 bytes fetched one at a time and 8,549 bytes in a single call.
