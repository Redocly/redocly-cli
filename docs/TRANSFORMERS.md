# Transformers

> NOTE: this features is experimental. Modifying your tree may break codeframes in errors

## Rationale

By default, custom visitors are run after the built-in ones. However, there might appear such situation, when the input data should be mutated before applying default rules and/or bundling. For this case, you might want to run certain custom visitors before in-built visitors.

You can do it with `transformers` visitors.

## Usage

First of all you will need to create a file with the custom rules and transformers. For example,

```js
export const id = 'customTransformers';

export const transformers = {
  oas3: {
    'duplicate-description': () => {
      return {
        Info(info) {
          if (info.description) {
            info.description = info.description + '\n' + info.description;
          }
        },
      };
    },
  },
};
```

Here we create a simple transformer which duplicates description in the `Info` section.

Then, we need to import it and turn on. To do that you can edit the `.redocly.yaml`:

```yaml
lint:
  # first of all, import the created .js file using
  # "plugins" object
  plugins:
    - './local-plugin.js' # your filename
  transformers:
    customTransformers/duplicate-description: on
```

After that, when you run a validation or bundling, the custom transformer will run before built-in or custom rules.