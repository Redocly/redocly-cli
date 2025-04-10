---
seo:
  title: Custom plugins in Redocly
---

# Custom plugins

Custom plugins are a powerful way to extend Redocly. Use of custom plugins requires in-depth knowledge of the document type (such as OpenAPI) that you are working with, JavaScript coding skills, and the plugin interface.
Custom plugins are recommended for advanced users who have exhausted the built-in options available, and who can develop JavaScript extensions themselves.
Each plugin is a JavaScript module which can export custom rules, configurations, preprocessors, decorators or type tree extensions.

{% admonition type="info" %}
For many users, our highly [configurable rules](../rules/configurable-rules.md) cover their needs without needing a custom plugin.
{% /admonition %}

Custom plugins use the [visitor pattern](./visitor.md) to traverse the document structure and apply the rules and decorators (and preprocessors if you have them) to each element. Rules defined in custom plugins may need additional context available, and this can be achieved using the [nested visitor approach](./visitor.md#nested-visitors) (please note that nested visitors are not available for decorators or preprocessors).

## Extend Redocly with custom plugins

Custom plugins can extend the built-in functionality of Redocly in the following ways:

- **Write your own custom rules in JavaScript**. If your API standards include elements that can't be expressed by our existing rules, including configurable ones, you can code your own rules. See the [documentation on writing your own rules in custom plugins](./custom-rules.md) for more information.

- **Define configuration in a custom plugin**. Redocly supports [resuable ruleset configuration](../guides/configure-rules.md#create-reusable-configuration) already, but defining configuration in a custom plugin is particularly useful when the configuration belongs alongside other plugin elements. See the [documentation on configuration in plugins](./custom-config.md) for more information.

- **Extend existing standard definitions with additional type definitions**. Working with extensions to defined standards can be helped by [extending the supported types](./extended-types.md).

- **Write custom decorators in JavaScript**. Not all API descriptions are exactly as we'd like them to be before passing them to the next stage of the API lifecycle. Redocly has a selection of [decorators available](../decorators), but if you need to build something more then [visit the documentation for building decorators in custom plugins](./custom-decorators.md).

## Add custom plugins to your project

Each plugin can contain any or many of each type of extension (rules, configuration, decorators, etc).

Define the plugins to include in the `redocly.yaml` configuration file, in the `plugins` section:

```yaml
plugins:
  - plugins/my-best-plugin.js
  - plugins/another-plugin.js
```

The paths are relative to the configuration file location. Where there are multiple features that happen at the same time, such as decorators, the plugins loaded first in the `plugins` section are processed first.

### Plugin structure

The minimal plugin should export a function that returns an object with a single property `id` that is used to refer to the contents of the plugin in the `redocly.yaml` configuration file:

```js
module.exports = function myPlugin() {
  return {
    id: 'my-local-plugin',
  };
};
```

## Supported formats

Everything that is exported from a plugin relates to one of the supported document formats, such as OpenAPI v3. Plugins work by exporting an object containing a key-value mapping from a document format and version (`oas2` or `oas3` are supported) to an extension object (rules, preprocessors, decorators).

Before processing the API description document, Redocly CLI detects the document format and applies a corresponding set of extensions.
