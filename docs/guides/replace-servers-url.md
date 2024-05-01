# Replace servers URL in different environments

Redocly allows you to use [custom decorators](../custom-plugins/custom-decorators.md) to modify content in the API description during the bundling process.

This page describes how to replace the server URL with a decorator for a given environment.

## Prerequisites

- [Install @redocly/cli](../installation.md). We use version 1.12.0 in this tutorial.

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
- Use your favorite IDE for editing files (we use VS Code and have the [Redocly extension](https://redocly.com/docs/redocly-openapi/) installed).

## Create a demo specification file

In this step, create an OpenAPI specification file. You will later use decorators to replace the server defined in this file.

1. Create a new directory and name it `replace-servers-demo`.

2. In `replace-servers-demo`, create an `original.yaml` file with the following content:

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
3. Save the file.

## Create a custom plugin

In this step, create a custom plugin and define the decorator dependency.

1. Inside `replace-servers-demo`, create a directory called `plugins`.

2. In the `plugins` directory, create a `plugin.js` file with this code:

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

{% admonition type="attention" %}
If you change the names of the plugins directory or the files, make sure to change them also in the Redocly configuration file [when registering your plugins and decorators](#add-a-decorator-and-associate-it-with-an-environment-variable).
{% /admonition %}

## Add a decorator and associate it with an environment variable

In this step, add a decorator and define the environment variable associated with it.

1. Inside `plugins`, create a `decorators` directory.
  
2. In `decorators`, create a `replace-servers-url.js` file with this code:

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

3. Save the file.

{% admonition type="attention" %}
If you change the name of the decorators directory, make sure to also change it in line 1 of the [`plugin.js` file](#create-a-custom-plugin).
{% /admonition %}

## Configure the plugin for use

To use the decorator, register your your `plugins` and `decorators` in the [Redocly configuration file](../configuration/index.md).

- In your Redocly configuration file, add this information:

    ```yaml
    apis:
      sample@v1-backend:
        root: original.yaml
        decorators:
          plugin/replace-servers-url:
            serverUrl: 'https://backend.example.com/v1'
      sample@v1-proxy:
        root: original.yaml
        decorators:
          plugin/replace-servers-url:
            serverUrl: 'https://proxy.example.com/v1'
    plugins:
      - './plugins/plugin.js'
    extends:
      - recommended
    ```

## Verify the output

### To check the configuration for the "backend" server:

1. Run the following command to bundle the `original.yaml` API with the "backend" server URL.

    ```yaml
    npx @redocly/cli bundle sample@v1-backend
    ```

2. Verify that the output shows the correct server URL.

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

### To check the configuration for the "proxy" server:

1. Run the following command bundles the `original.yaml` API with the "proxy" server URL.

    ```yaml
    npx @redocly/cli bundle sample@v1-proxy
    ```

2. Verify that the output shows the correct server URL.

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
