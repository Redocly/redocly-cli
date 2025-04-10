# Type extensions in plugins

Redocly CLI in its core has a type tree which defines the structure of the API description.
Redocly CLI then uses it to do a type-aware traversal of an OpenAPI description.

The type tree is built from top level `Types` which can link to child types. For example, here is a [visual reference to the OpenAPI types structure](https://redocly.com/docs/openapi-visual-reference/openapi-node-types/). You can also check [the code itself](https://github.com/Redocly/redocly-cli/tree/main/packages/core/src/types) for information about specific versions of OpenAPI and other supported document types.

The type tree can be extended by exporting the `typeExtension` function from a custom plugin.

## Type extension example

Consider an OpenAPI that uses an (imaginary) specification extension `x-metadata` which must contain information about the lifecycle state of the API, and which team owns the API. A snippet of the OpenAPI to show the example clearly:

```yaml
openapi: 3.1.0
info:
  title: Food Empire API
  version: 0.5.1
  x-metadata:
    lifecycle: production
    owner-team: Engineering/Integrations
```

Define the type extension for the new `x-metadata` section, in this example, we make the `lifecycle` field required.

```js
const XMetaData = {
  properties: {
    lifecycle: { type: 'string', enum: ['development', 'staging', 'production']},
    'owner-team': { type: 'string'},
  },
  required: ['lifecycle']
};
```

Note the quotes around the `owner-team` key since it contains a hyphen `-`. These fields are strings but you can also define other data structures if you need to represent something more complex. The [built-in type definitions](https://github.com/Redocly/redocly-cli/tree/main/packages/core/src/types) are a good place to look for examples.

To include the new type in the type tree, the plugin must add the type and modify the parent type, which in this example is `info`. This is done by returning a `typeExtension` structure, as shown in the example below (this example is in `plugins/example-type-extension.js`, this filename is used again in the configuration example later):

```js
module.exports = function typeExtensionsPlugin() {
  return {
    id: 'example-type-extension',
    typeExtension: {
      oas3(types) {
        return {
          ...types,
          XMetaData: XMetaData,
          Info: {
            ...types.Info,
            properties: {
              ...types.Info.properties,
              'x-metadata': 'XMetaData',
            },
          },
        };
      },
    },
  };
};
```

You can use the new type immediately to check the validity of your API document. First, include the plugin in `redocly.yaml` and enable the `spec` rule:

```yaml
extends: []

plugins:
 - 'plugins/example-type-extension.js'

rules:
  spec: warn
```

Now lint your API description with `redocly lint openapi.yaml` and try removing the `lifecycle` field from within the `x-metadata` section. It's a required field, so you see an error if it's missing.
