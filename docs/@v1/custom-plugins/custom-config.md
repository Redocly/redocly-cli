# Configuration bundles in plugins

You can bundle configurations under the `configs` key in your plugin code. These configuration bundles are
useful when you declare multiple rules or decorators in your plugin, and you want to
define within the plugin how to combine them. Each plugin can have multiple
configuration bundles, and the user can use any of them in their `redocly.yaml`
configuration file.

The following is an example plugin, defining two configuration bundles:

```js
module.exports = function myLocalPlugin() {
  return {
    id: 'my-local-plugin',
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
      },
    },
  };
};
```

In the example, the plugin id is `my-local-plugin` and the `all` and `minimal`
configuration bundles are available in the user's `redocly.yaml` configuration file as
`"my-local-plugin/all"` and `"my-local-plugin/minimal"`, respectively. Use
these configuration bundles by adding them under `extends:` in your `redocly.yaml` configuration file.

```yaml
extends:
  - my-local-plugin/all
```

Plugins can include rules, decorators, and preprocessors in their configuration bundles.

{% admonition type="info" name="Rulesets" %}
If your configuration includes only Redocly built-in rules and decorators, try
using a [ruleset](../rules.md#rulesets) to achieve this (it's simpler than a
plugin).
{% /admonition %}
