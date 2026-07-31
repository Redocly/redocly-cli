---
'@redocly/client-generator': minor
---

Added an opt-in success envelope to throw-mode calls: pass `{ envelope: true }` to get `{ data, headers, response }` instead of the body alone.
`headers` is a typed camelCase object built from the operation's declared success-response headers; `response` is the raw `Response`.
Default call sites stay body-only, and the TanStack Query and SWR wrappers exclude the option.
