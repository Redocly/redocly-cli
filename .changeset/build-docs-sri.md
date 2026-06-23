---
'@redocly/cli': patch
---

Added Subresource Integrity to `build-docs` output: the generated HTML now loads `redoc.standalone.js` from the CDN with an `integrity` hash and `crossorigin="anonymous"`, so the browser verifies the script before running it. The hash is tied to the Redoc version bundled with the CLI.
