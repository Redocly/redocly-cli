---
seo:
  title: Redocly CLI guides
  description: Browse how-to guides for working with Redocly CLI
---

# Redocly CLI guides

A selection of guides to common tasks with Redocly CLI.

{% cards columns=1 %}

{% card
    title="Redocly CLI quickstart"
    to="../quickstart"
  %}
Take your first steps with Redocly CLI.
{% /card %}

{% card
    title="OpenAPI starter project"
    to="../openapi-starter"
  %}
Get started with OpenAPI and Redocly, using this sample project.
{% /card %}

{% card
    title="Enforce response contents"
    to="./response-contains-property"
  %}
Create a custom rule to enforce response contents.
{% /card %}

{% card title="Lint and bundle in one command"
    to="./lint-and-bundle"
  %}
Combine lint and bundle commands, and check each command succeeds.
{% /card %}

{% card title="Hide internal APIs"
    to="./hide-apis"
  %}
Prevent APIs from being viewed by external audiences.
{% /card %}

{% card title="Replace the server URL"
    to="./replace-servers-url"
  %}
Replace the server URL in different environments.
{% /card %}

{% card title="Lint AsyncAPI descriptions"
    to="./lint-asyncapi"
  %}
API governance for async and streaming API applications.
{% /card %}

{% card title="Lint Arazzo descriptions"
    to="./lint-arazzo"
  %}
Check the validity of Arazzo descriptions for workflows.
{% /card %}

{% card title="Lint Open-RPC descriptions"
    to="./lint-openrpc"
  %}
Check the validity of Open-RPC descriptions.
{% /card %}

{% card title="Change the OAuth2 token URL"
    to="./change-token-url"
  %}
How to change the OAuth2 token URL.
{% /card %}

{% card title="Hide OpenAPI specification extensions"
    to="./hide-specification-extensions"
  %}
How to create a custom decorator to hide OpenAPI specification extensions.
{% /card %}

{% card title="Configure API linting rules"
    to="./configure-rules"
  %}
Combine built-in and custom rules to match your API's standards.
{% /card %}

{% card title="Use the generated client"
    to="./use-generated-client"
  %}
Authenticate, handle errors, and compose middleware with a client from `generate-client`.
{% /card %}

{% card title="Customize client generation"
    to="./customize-client-generation"
  %}
Pre-configure publisher defaults and write custom client generators.
{% /card %}

{% card title="Where the index pays"
    to="./tree-agent-index-benchmark"
  %}
Six tasks over six descriptions, 41 KB to 2,909 files: where an index decides whether a model gets there at all, and where the description is already one.
{% /card %}

{% card title="Where the index pays — every run"
    to="./tree-agent-index-benchmark-detailed"
  %}
The long form of the same measurement: all 360 runs with the commands each issued, per-run verdicts, and the full failure tally.
{% /card %}

{% card title="Set up tab completion"
    to="./autocomplete"
  %}
Generate shell completions for the `redocly` command.
{% /card %}

{% card title="Update Redocly CLI"
    to="./update-cli"
  %}
Keep your Redocly CLI installation current with the latest features and fixes.
{% /card %}

{% card title="Migrate to Redocly CLI v2"
    to="./migrate-to-v2"
  %}
Essential changes when upgrading from v1.x to v2.x.
{% /card %}

{% card title="Migrate from openapi-cli"
    to="./migrate-from-openapi-cli"
  %}
Upgrade from the deprecated openapi-cli by replacing it with `redocly`.
{% /card %}

{% card title="Migrate from redoc-cli"
    to="./migrate-from-redoc-cli"
  %}
Replace the legacy redoc-cli commands with Redocly CLI equivalents.
{% /card %}

{% card title="Migrate from Spectral"
    to="./migrate-from-spectral"
  %}
Switch from Spectral to Redocly CLI's linting and tooling.
{% /card %}

{% card title="Migrate from swagger-cli"
    to="./migrate-from-swagger-cli"
  %}
Replace the deprecated swagger-cli package with Redocly CLI.
{% /card %}

{% /cards %}
