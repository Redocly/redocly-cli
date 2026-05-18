---
"@redocly/cli": patch
---

Fixed an issue where the Respect command did not honor the `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY` environment variables when loading remote source descriptions or resolving external `$ref`s. Proxy settings are now consistently applied during reference resolution as well.
