---
seo:
  title: Redocly CLI guides
  description: Browse how-to guides for working with Redocly CLI
content:
  cards:
    - header: Redocly CLI quickstart
      link: docs/cli/v2/quickstart
      text: Take your first steps with Redocly CLI.
    - header: OpenAPI starter project
      link: docs/cli/v2/openapi-starter
      text: Get started with OpenAPI and Redocly, using this sample project.
    - header: Enforce response contents
      link: docs/cli/v2/guides/response-contains-property
      text: How to create a custom rule to enforce response contents.
    - header: Lint and bundle in one command
      link: docs/cli/v2/guides/lint-and-bundle
      text: Combine lint and bundle commands, and check each command succeeds.
    - header: Hide internal APIs
      link: docs/cli/v2/guides/hide-apis
      text: How to hide internal APIs.
    - header: Replace the server URL
      link: docs/cli/v2/guides/replace-servers-url
      text: How to replace the server URL in different environments.
    - header: Lint AsyncAPI descriptions
      link: docs/cli/v2/guides/lint-asyncapi
      text: API governance for async and streaming API applications.
    - header: Lint Arazzo descriptions
      link: docs/cli/v2/guides/lint-arazzo
      text: Check the validity of Arazzo descriptions for workflows.
    - header: Change the OAuth2 token URL
      link: docs/cli/v2/guides/change-token-url
      text: How to change the OAuth2 token URL.
    - header: Hide OpenAPI specification extensions
      link: docs/cli/v2/guides/hide-specification-extensions
      text: How to create a custom decorator to hide OpenAPI specification extensions.
---

# Redocly CLI guides

A selection of guides to common tasks with Redocly CLI.

{% wideTileCards content=$frontmatter.content /%}
