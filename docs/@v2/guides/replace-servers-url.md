# Replace servers URL in different environments

Redocly allows you to use [custom decorators](../custom-plugins/custom-decorators.md) to modify content in the API description during the bundling process.

You can use this method to create multiple instances of an API description file from a single source, each with a different server. For example, you can have separate API descriptions configured with your mock server and your production server, or separate API files for each of your customers.

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

## Create a demo folder and description file

Before you start, create a demo folder and a sample OpenAPI description file to later test your plugin and decorators.

1. Create a new folder and name it `replace-servers-demo`.

2. In the `replace-servers-demo` folder, create an `original.yaml` file with the following content:

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

1. In the `replace-servers-demo` folder, create a folder called `plugins`.

2. In the `plugins` folder, create a `plugin.js` file with this code:

```js
import ReplaceServersURL from './decorators/replace-servers-url.js';

/** @type {import('@redocly/cli').DecoratorsConfig} */
const decorators = {
  oas3: {
    'replace-servers-url': ReplaceServersURL,
  },
};

export default function replaceServersUrlPlugin() {
  return {
    id: 'plugin',
    decorators,
  };
}
```

3. Save the file.

{% admonition type="info" %}
If you change the names of the plugins directory or the files, make sure to change them also in the Redocly configuration file [when registering your plugins and decorators](#add-a-decorator-and-associate-it-with-an-environment-variable).
{% /admonition %}

## Add a decorator and associate it with an environment variable

In this step, add a decorator and define the environment variable associated with it.

1. Inside the `plugins` folder, create a `decorators` folder.

2. In the `decorators` folder, create a `replace-servers-url.js` file with this code:

```js
/** @type {import('@redocly/cli').OasDecorator} */
export default function ReplaceServersURL({serverUrl}) {
  return {
    Server: {
      leave(Server) {

        if (serverUrl) {
          Server.url = serverUrl;
        }

      }
    }
  };
}
```

3. Save the file.

{% admonition type="info" %}
If you change the name of the decorators directory, make sure to also change it in line 1 of the [`plugin.js` file](#create-a-custom-plugin).
{% /admonition %}

## Configure the plugin for use

To use the decorators, register your `plugins` and `decorators` in the [Redocly configuration file](../configuration/index.md).

- In your Redocly configuration file, register your plugins and decorators:

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

### Check the configuration for the "backend" server

1. Run the following command to bundle the `original.yaml` API with the "backend" server URL.

```shell
npx @redocly/cli@latest bundle sample@v1-backend
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

### Check the configuration for the "proxy" server

1. Run the following command bundles the `original.yaml` API with the "proxy" server URL.

```shell
npx @redocly/cli@latest bundle sample@v1-proxy
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

## Summary

In this tutorial you have created a plugin and a decorator that replace the server URL with one of the URLs defined in the Redocly configuration file.

You now have two API description files, each configured to send requests to different servers.

## What's next?

You can reuse the code from your demo files and modify it to fit your API documentation.

For more custom plugins, configuration, and other resources, see the [Redocly CLI Cookbook](https://github.com/Redocly/redocly-cli-cookbook).

For the latest Redocly news and articles, visit our [blog](https://redocly.com/blog/).
