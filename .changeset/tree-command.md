---
'@redocly/openapi-core': minor
'@redocly/cli': minor
---

Added an experimental `tree` command that prints an API description as a navigable index: an overview of its servers, security, tags, webhooks, and component sections, with selectors to drill into a single operation, component, or file, its transitive `$ref` closure, and what depends on it.
It also has a `--format=ai` output that returns the same views as compact plain text for agents.
See the [`tree` command reference](https://redocly.com/docs/cli/commands/tree).
