# Respect Your API. Monitor with Confidence

## `@redocly/respect-core`

Continuous API monitoring powered by OpenAPI Arazzo workflows.

This package cannot be used standalone. Please install and use [@redocly/cli](https://github.com/Redocly/redocly-cli) to run API tests.

## What is Respect?

Respect is Redocly's API contract testing system that validates your APIs match their OpenAPI descriptions. It sends real HTTP requests to your API server and compares responses against the expectations defined in your OpenAPI specification and Arazzo workflows.

- Write tests in human-readable Arazzo format
- Get started quickly with auto-generated test workflows
- Catch API drift before it breaks your ecosystem
- Links API requests to OpenAPI descriptions automatically
- Catch problems early in development and CI/CD pipelines

## Getting Started

1. **Install Redocly CLI** (if not already installed):

   ```sh
   npm install @redocly/cli -g
   ```

2. **Generate test workflows** from your OpenAPI spec:

   ```sh
   redocly generate-arazzo openapi.yaml
   ```

3. **Run your first test**:

   ```sh
   redocly respect auto-generated.arazzo.yaml --verbose
   ```

4. **Create custom workflows** using Arazzo format for complex testing scenarios

## Requirements

You **MUST** have a working API server running in order to run the tests because Respect sends real HTTP requests.

## Documentation and resources

- [Respect documentation](https://redocly.com/docs/respect)
- [Getting started guide](https://redocly.com/docs/respect/get-started)
- [Use cases](https://redocly.com/docs/respect/use-cases)
- [Arazzo workflow testing](https://redocly.com/docs/respect/guides/test-api-sequences)
- [Command reference](https://redocly.com/docs/respect/commands/respect)
- [Respect CLI Overview](https://redocly.com/respect-cli)
