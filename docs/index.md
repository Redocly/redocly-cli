---
tocMaxDepth: 2
redirects:
  '/docs/cli/resources/':
    to: '/docs/cli/'
content:
  cards:
    - header: Great API docs
      link: docs/cli/api-docs
      text: Use open source Redoc or our hosted tools to create clear and useful documentation with local previews and static builds available.
    - header: Manage OpenAPI files
      link: docs/cli/file-management
      text: Split an OpenAPI description into logical chunks, bundle the chunks to create a single file, or even join existing definitions into one.
    - header: Transform OpenAPI
      link: docs/cli/decorators
      text: Publish a subset of endpoints, or use decorators to enhance your existing OpenAPI by adding, changing, or removing content.
    - header: API governance
      link: docs/cli/api-standards
      text: Check that your API is up to standard on every revision. Our ready-made rulesets, built-in and configurable rules let you compose the API standards that fit each of your APIs.
---

# Redocly CLI

Redocly CLI is an open source command-line tool for working with OpenAPI descriptions, developer portals, and other API lifecycle operations including API linting, enhancement, and bundling.

`redocly` brings together the open source goodness with the rest of the Redocly offerings.
Authenticate, update APIs, publish documentation, and use the other tools to manage, polish and share the APIs throughout the API lifecycle.

{% wideTileCards content=$frontmatter.content /%}

## About Redocly and Redoc

Redoc is our open source API documentation tool. Use `redocly` (this project) to work with your Redoc documentation projects.

The Redocly CLI also supports many of the other operations you need to be successful working with OpenAPI. API linting, enhancement, bundling and other tools are also available as part of this open source CLI tool.

Redocly offers a full suite of API lifecycle tools as commercial offerings; you can manage those from this tool too.

## Want to contribute?

Then join our active and supportive community! The source code is available [on GitHub](https://github.com/Redocly/redocly-cli).
