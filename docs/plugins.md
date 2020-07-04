# Working with Plugins

Plugins can be used to extend behaviour of `@redocly/openapi-cli`. Each plugin is an javascript module which can export custom rules, preprocessors, decorators or type tree extenstions.

## Plugin structure

The minimal plugin should export `id` string:

```js
module.exports = {
  id: 'my-local-plugin'
}
```

## OAS Major versions

Everything that is exported from plugin can be related to one of supported OAS3 major versions. It is done by exporting object containing key-value mapping from major OAS version (`oas2` or `oas3` are supported) to the extension object (rules, prerpocessors, etc.).

Before processing the definition document openapi-cli detects the OAS version and applies corresponding set of extensions.

## Rules in Plugins

Plugins can expose additional rules for use in openapi-cli. To do so, the plugin must export a `rules` object containing a key-value mapping of rule ID to rule. The rule ID does not have to follow any naming convention (so it can just be `tag-name`, for instance). The rules defined in

```js
module.exports = {
  id: 'my-local-plugin',
  rules: {
    oas3: {
      'tag-name': () => {
        //...
      },
    }
    oas2: {}
  }
}
```

To use the rule in openapi-cli, you would use the plugin name, followed by a slash, followed by the rule name. So if this plugin id is `my-local-plugin`, then in your configuration you'd refer to the rule by the name `my-local-plugin/tag-name`. Example: `"rules": {"my-local-plugin/tag-name": "error"}`.

See [rules documentation](./custom-rules.md)

## Preprocessors and Decorators in Plugins

In order to create a preprocessor or decorators, the object that is exported from your module has to conform to the following interface:

```js
module.exports = {
  id: 'my-local-plugin`,
  preprocessors: {
    oas3: {
      "processor-id": () => {
        // ...
      }
    }
  },
  decorators: {
    oas3: {
      "decorator-id": () => {
        // ...
      }
    }
  }
}
```

See [preprocessors and decorators documentation](./preprocessors-and-decorators.md)

## Configs in Plugins

You can bundle configurations inside a plugin by specifying them under the `configs` key. Multiple configurations are supported per plugin. Note that it is not possible to specify a default configuration for a given plugin and that users must specify in their configuration file when they want to use one.

```js
module.exports = {
  id: 'my-local-plugin'
  configs: {
    all: {
      rules: {
        'operation-id-not-test': 'error',
        'boolean-parameter-prefixes': 'error',
      },
    },
    minimal: {
      rules: {
        'operation-id-not-test': 'off',
        'boolean-parameter-prefixes': 'error',
      },
    }
  }
};
```

If the example plugin above id was `my-local-plugin`, the `all` and `minimal` configurations would then be usable by extending off of `"my-local-plugin/all"` and `"my-local-plugin/minimal"`, respectively.

```yaml
extends:
  - my-local-plugin/all
```


## Type Extensions in plugins

See [type extensions](./type-extensions.md)

Plugin can define certain type extension. To do so it must export `typeExtension` property:

```js
module.exports = {
  id: 'my-local-plugin',
  typeExtension: {
    oas3(types) {
      // modify types here
      return {
        ...types,
        // add new or modify existing
      };
    },
  }
};
```

## Share Plugins

Community plugins are not supported yet.

