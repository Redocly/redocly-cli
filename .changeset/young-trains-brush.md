---
"@redocly/openapi-core": major
---

Streamlined Redocly configuration interfaces for improved developer experience.
Removed `StyleguideConfig` class in favor of the unified `Config` class.
Removed `getMergedConfig` function - use `Config.forAlias()` method instead to retrieve API-specific configurations.
