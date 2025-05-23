---
"@redocly/respect-core": minor
"@redocly/openapi-core": minor
"@redocly/cli": minor
---

Added `x-security` extension for Respect that enables secure handling of authentication in Arazzo workflows.
This extension allows you to:

- Define security schemes at the step level using either predefined schemes or inline definitions
- Pass secrets values (passwords, tokens, API keys)
- Support multiple authentication types including API Key (query, header, or cookie), Basic Authentication, Bearer Token, Digest Authentication, OAuth2, and OpenID Connect
- Automatically transform security parameters into appropriate HTTP headers or query parameters
