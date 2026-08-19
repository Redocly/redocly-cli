---
'@redocly/cli': minor
'@redocly/openapi-core': minor
---

Added the effective security requirement to `tree --format=ai`: an operation card opens with an `auth:` line and an overview carries a `security:` line, each naming the schemes that apply and what they ask the caller to send, such as `apiKey in header REB-APIKEY`. An operation that declares no requirement of its own shows the root one it inherits, which its source does not state.
