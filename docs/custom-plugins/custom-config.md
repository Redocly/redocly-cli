## Configuration in plugins

Plugins can include configuration, under the `configs` key. This is
useful when your plugin declares multiple rules or decorators, and you want to
define within the plugin how to combine them.  Each plugin can have multiple
bundles of configuration, and the user can use any of them in their
configuration file.


Here's an example of configuration in a plugin, defining two bundles:

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

With the example plugin above id as `my-local-plugin`, the `all` and `minimal`
configurations become available in the user's configuration file as
`"my-local-plugin/all"` and `"my-local-plugin/minimal"`, respectively. Use
these configurations by adding them under `extends:` in `redocly.yaml`.

```yaml
extends:
  - my-local-plugin/all
```

Plugins can include rules, decorators and preprocessors in their configuration bundles.

:::info Rulesets

If your configuration includes only Redocly built-in rules and decorators, try
using a [ruleset](..//rules.md#rulesets) to achieve this (it's simpler than a
plugin).

:::

