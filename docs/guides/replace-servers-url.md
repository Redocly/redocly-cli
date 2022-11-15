---
redirectFrom:
  - /docs/workflows/guides/replace-server-url/
  - /docs/cli/guides/replace-server-url/

---
# Replace servers URL in different environments

Redocly allows you to use [custom decorators](../resources/custom-plugins.md) to modify content in the API definition during the bundling process.

This page describes how to replace the server URL with a decorator for a given environment.

## Prerequisites

:::note We do, You do
This tutorial is most effective when you follow along and complete the steps.
:::

- [Install @redocly/cli](../installation.md) with version 1.0.0-beta.111 or later (we use 1.0.0-beta.111 in this tutorial).
- Save the following OpenAPI file as `original.yaml` into a new directory named `replace-servers-demo`.
    ```yaml
    openapi: 3.1.0
    info:
      version: 1.0.0
      title: Custom decorators demo
      description: The servers URL is replaced by the decorator during the `bundle` process.
    servers:
      - url: 'https://example.com/api/v1'
    paths:
      /status:
        get:
          summary: Get status
          operationId: getStatus
          security: []
          responses:
            '204':
              description: Status OK
            '400':
              description: Status not OK
    ```
- Use your favorite IDE for editing files (we use VS Code and have the [Redocly extension](../../redocly-openapi/index.md) installed).

## Step 1: Create a custom plugin

In this step, create a custom plugin and define the decorator dependency.

1. Create a directory called `plugins`.

2. Create a `plugin.js` file inside of the `plugins` directory with this information.

```JavaScript
const ReplaceServersURL = require('./decorators/replace-servers-url');
const id = 'plugin';

/** @type {import('@redocly/cli').DecoratorsConfig} */
const decorators = {
  oas3: {
    'replace-servers-url': ReplaceServersURL,
  },
};

module.exports = {
  id,
  decorators,
};
```

3. Save the file.

:::attention

You can name the plugins directory and file anything you want. Make sure you use the correct name in the Redocly configuration file (Step 3).

:::

## Step 2: Add a decorator and associate it with an environment variable

In this step, you will add a decorator and define the environment variable associated with it.

1. Create a directory `decorators` inside of the `plugins` directory.
1. Create a `replace-servers-url.js` file with this information and save it inside of the `decorators` directory.

```JavaScript
module.exports = ReplaceServersURL;

/** @type {import('@redocly/cli').OasDecorator} */

function ReplaceServersURL({serverUrl}) {
  return {
    Server: {
      leave(Server) {

        if (serverUrl) {
          Server.url = serverUrl;
        }

      }
    }
  }
};
```

:::attention

You can name the decorators directory anything you want. Make sure you use the correct directory name in line 1 of the `plugin.js` file (Step 1).

:::

## Step 3: Configure the plugin for use

To use the decorator, you will need to register your plugin in your Redocly configuration file. Register your `plugins` and `decorators`.

```yaml
apis:
  sample@v1-backend:
    root: original.yaml
    decorators:
      plugin/replace-servers-url:
        serverUrl: "https://backend.example.com/v1"
  sample@v1-proxy:
    root: original.yaml
    decorators:
      plugin/replace-servers-url:
        serverUrl: "https://proxy.example.com/v1"
plugins:
  - "./plugins/plugin.js"
extends:
  - recommended
```

## Step 4: Verify the output

The following command bundles the `original.yaml` API with the "backend" server URL.
```yaml
npx @redocly/cli bundle sample@v1-backend
```
The output should show the correct server URL.
```yaml
openapi: 3.1.0
info:
  version: 1.0.0
  title: Custom decorators demo
  description: The servers URL is replaced by the decorator during the `bundle` process.
servers:
  - url: https://backend.example.com/v1
# ...
```

The following command bundles the `original.yaml` API with the "proxy" server URL.
```yaml
npx @redocly/cli bundle sample@v1-proxy
```
The output should show the correct server URL.
```yaml
openapi: 3.1.0
info:
  version: 1.0.0
  title: Custom decorators demo
  description: The servers URL is replaced by the decorator during the `bundle` process.
servers:
  - url: https://proxy.example.com/v1
# ...
```
