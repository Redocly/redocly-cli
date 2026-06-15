---
'@redocly/respect-core': patch
---

Fixed a remote code execution vulnerability where a crafted $faker expression in
an Arazzo description could execute arbitrary JavaScript during respect runs.
Thanks to Hamza Haroon (GitHub: @thegr1ffyn) for the report.
