---
'@redocly/cli': minor
---

Added an experimental `drift` command that compares recorded HTTP traffic (HAR, Kong, Nginx/Apache JSON, NDJSON) against an OpenAPI description and reports undocumented endpoints, schema mismatches, and security findings. Without an API description it generates a draft OpenAPI 3.1 document from the observed traffic.
