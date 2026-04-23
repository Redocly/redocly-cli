# Replace servers URL in different environments

Redocly allows you to use [custom decorators](../custom-plugins/custom-decorators.md) to modify content in the API description during the bundling process.

You can use this method to create multiple instances of an API description file from a single source, each with a different server. For example, you can have separate API descriptions configured with your mock server and your production server, or separate API files for each of your customers.

This page describes how to replace the server URL with a decorator for a given environment.

## Prerequisites

- [Install Redocly CLI](../installation.md) version 2.x.
- Use an editor for working with YAML and JavaScript files. We use VS Code with the [Redocly extension](https://redocly.com/docs/vscode) installed.

## Create a demo folder and description file

Create a working folder and a sample OpenAPI file that the decorator in the following sections uses as its input.

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

A plugin is the container that registers a decorator with Redocly CLI. Create the plugin file first and wire up the decorator it depends on; the decorator itself is added in the next section.

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
The `plugins` folder and the `plugin.js` file can be renamed. In that case, the import path above, and the `plugins` entry in the Redocly configuration file, must [match the new names](#configure-the-plugin-for-use).
{% /admonition %}

## Add a decorator

The decorator is the function that modifies the API description. It accepts a `serverUrl` parameter from the Redocly configuration file and overwrites the URL on every `Server` node in the document.

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
The `decorators` folder can be renamed. In that case, keep the import path in the [`plugin.js` file](#create-a-custom-plugin) in sync with the new name.
{% /admonition %}

## Configure the plugin for use

Register the plugin in the [Redocly configuration file](../configuration/index.md) and create one API entry per environment. Each API entry passes a different `serverUrl` value to the same decorator, producing multiple outputs from a single source file.

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

1. Run the following command to bundle the `original.yaml` API with the "proxy" server URL.

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
