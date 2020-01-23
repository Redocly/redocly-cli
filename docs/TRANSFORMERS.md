# Transformers

> NOTE: this features is experimental. Modifying your tree may break codeframes in errors

## Rationale

By default, custom visitors are run after the built-in ones. However, there might appear such situation, when the input data should be mutated before applying default rules and/or bundling. For this case, you might want to run certain custom visitors before in-built visitors.

You can do it with `transformers` visitors.

## Usage

To create a visitor which will run before the default ones you should define a parameter `transformers` in your `.redocly.yaml` config file and pass it a path to the JavaScript file similar to one you use for usual [custom visitors](CUSTOM_VISITORS.md).

To change the data in the transformer visitor you can modify the `node` object passed in as a parameter. For example, following example checks if there's a vendor extension `x-redocly-overlay` field inside node, it reads a file determined by the field's content and updates node with files contents.

```js
class OverlaysMerger {
  static get rule() {
    return 'writeCheck';
  }

  any() {
    return {
      onEnter: (node, _type, _ctx) => {
        if (node['x-redocly-overlay']) {
          const definitionDir = path.dirname(ctx.filePath);
          const overlayPath = path.resolve(definitionDir, node['x-redocly-overlay'].path);

          if (fs.existsSync(overlayPath)) {
            const patch = JSON.parse(fs.readFileSync(overlayPath));

            Object.keys(patch).forEach((k) => {
              node[k] = patch[k];
            });

            delete node['x-redocly-overlay'];
          }
        }
      },
    };
  }
}
```

The only difference between `customRules` and `transformers` is the execution order. `customRules` are run after the default visitors and `transformers` are run before them.