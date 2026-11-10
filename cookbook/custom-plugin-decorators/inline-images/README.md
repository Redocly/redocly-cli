# Inline images in descriptions

Authors:

- [`@tatomyr`](https://github.com/tatomyr), Andrew Tatomyr (Redocly)

## What this does and why

`redocly bundle` collects the files of an API description into one file, but an image that a description shows stays a separate file, because its path is plain text inside the description.
So the bundle is incomplete on its own, and the image files have to travel with it to every place it is sent or published.
The path is relative to the file that the description was written in, so it points to the wrong place when the bundle is written to another folder, or when the description comes from a file in a subfolder.
A reader of the docs then sees a broken image, and nothing reports it.

This decorator puts the images into the bundle itself.
It replaces each image path in a `description` field with the content of the image, so the bundled file shows the images wherever it goes.
It works for the HTML form, `<img src="...">`, and for the Markdown form, `![alt](...)`, with SVG, PNG, and JPEG files.

## Code

The decorator visits every `description` field, and replaces each image path with a `data:` URI.
The following snippet shows its main part, and the full code is in [`inline-images.js`](./inline-images.js):

```js
const InlineDescriptionImages = () => ({
  any: {
    enter(node, { location }) {
      if (typeof node?.description !== 'string') return;
      const folder = dirname(location.source.absoluteRef);
      const inlineImage = (match, prefix, imagePath) => {
        const mimeType = MIME_TYPES[extname(imagePath).toLowerCase()];
        // ...
        const image = readFileSync(resolve(folder, imagePath)).toString('base64');
        return `${prefix}data:${mimeType};base64,${image}`;
      };
      node.description = node.description
        .replace(HTML_IMAGE_PATH, inlineImage)
        .replace(MARKDOWN_IMAGE_PATH, inlineImage);
    },
  },
});
```

The `any` visitor runs for every node of the API description, so the decorator finds the `description` fields of all objects: the info, the tags, the operations, the schemas, and the others.
`HTML_IMAGE_PATH` and `MARKDOWN_IMAGE_PATH` are regular expressions that find the image paths in the text of a description, one for `<img src="...">` and one for `![alt](...)`.
Each path is relative to the file that holds the description, and `location.source.absoluteRef` is the path of that file, so an image path also works in a file that a `$ref` points to.
The decorator then reads the image file, encodes it as base64, and writes it back in place of the path, with the MIME type that `MIME_TYPES` holds for the file extension.

Put the `inline-images.js` file alongside your `redocly.yaml` file, and add the following configuration to `redocly.yaml`:

```yaml
plugins:
  - inline-images.js

decorators:
  inline-images/descriptions: on
```

When you run `redocly bundle`, the images become part of the bundled API description.
The decorator is also useful for the output of `redocly build-docs`, because that command applies the decorators too, so the HTML page it builds holds the images and needs no image files next to it.

## Examples

Before the change, an example based on the [Redocly Cafe API](https://cafe.redocly.com/openapi/cafe), with the `images/logo.svg` and `images/menu.png` files next to it:

```yaml
openapi: 3.1.0
info:
  version: 1.0.0
  title: Redocly Cafe
  description: |
    <img src="./images/logo.svg" alt="Redocly Cafe" />

    Demo API for cafe operators to manage menus, orders, and revenue.
paths:
  /menu:
    get:
      summary: List menu items
      description: Returns the menu. ![Menu](images/menu.png)
      operationId: listMenuItems
      responses:
        '200':
          description: OK
```

After the decorator has been run, the bundled file looks like the following example (the image content is shortened):

```yaml
openapi: 3.1.0
info:
  version: 1.0.0
  title: Redocly Cafe
  description: |
    <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0i..." alt="Redocly Cafe" />

    Demo API for cafe operators to manage menus, orders, and revenue.
paths:
  /menu:
    get:
      summary: List menu items
      description: Returns the menu. ![Menu](data:image/png;base64,iVBORw0KGgo...)
      operationId: listMenuItems
      responses:
        '200':
          description: OK
```

You could also edit the plugin to support other image types as you need.

## References

- [Redocly Cafe API](https://cafe.redocly.com/openapi/cafe), the API the example is based on
- [`data:` URLs](https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes/data)
