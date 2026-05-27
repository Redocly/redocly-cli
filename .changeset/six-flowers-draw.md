---
'@redocly/cli': patch
---

Pinned the official Docker image base to `node:24-alpine`. The previous floating `node:alpine` tag started pulling Node.js 26+, whose internal `undici` is incompatible with the `undici@6.x` dispatcher we ship and caused `redocly push` to fail.
