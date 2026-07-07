# Security guidelines

The essentials are in `AGENTS.md`: this is the depth.
The CLI reads local and remote files, resolves `$ref`s across documents, authenticates against Redocly cloud, and runs real HTTP requests in respect-core — treat all of that as untrusted input.

1. Never hardcode credentials, tokens, or API keys.
   Read them from the environment or the existing auth flow, and never log their values.
1. Validate and type-check external input — `redocly.yaml`, CLI arguments, and fetched documents — before using it.
1. Never use `eval` or build shell commands from unsanitised input.
   The runtime-expression evaluator in respect-core stays expression-only, not arbitrary code execution.
1. Treat resolved `$ref`s and remote URLs as untrusted: guard file writes (bundle, split, eject) against path traversal, and don't fetch outside the intended scope.
1. Log sensitive operations without their sensitive values — tokens, secrets, and auth headers never reach the logger.
