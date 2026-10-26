---
'@redocly/client-generator': minor
'@redocly/cli': minor
---

Added the `java` generator to the `generate-client` command.
It writes a Java SDK in one file with no dependencies, with the same auth, retry, pagination, SSE, and multipart support as the Python, Go, and PHP SDKs.
The `eject-generator` command accepts `java` too.

**Note**: the generated code needs Java 17 or newer.
