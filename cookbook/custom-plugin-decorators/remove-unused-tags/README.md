# Remove unused tags

Authors:

- [`@lornajane`](https://github.com/lornajane), Lorna Mitchell (Redocly)

## What this does and why

A custom plugin with a decorator that looks at each operation in the API description, and counts how many times each tag is used. Any that are not used by any operation are removed.

There is support for an array of tags to ignore; these tags won't be removed from the API description even if they are unused.

This is a useful decorator to use when you are reducing a larger OpenAPI file for a specific output case. Using the [filter-out decorator](https://redocly.com/docs/cli/decorators/filter-out/) for example can leave tags that are no longer needed.

## Code

The plugin code itself is in `tags.js`:

```js
export default function plugin() {
  return {
    id: 'tags',
    decorators: {
      oas3: {
        'no-unused-tags': ({ ignore }) => {
          console.log('Cleaning up unused tags...');
          // mark the ignored tags as already used so we don't remove them
          const usedTags = new Set(ignore?.map((tag) => tag.toLowerCase()));
          return {
            Operation: {
              enter(operation) {
                // log all the tags that are in use
                for (const tag of operation.tags || []) {
                  usedTags.add(tag.toLowerCase());
                }
              },
            },
            Root: {
              leave(root) {
                // remove any tags that we didn't find in use or marked to ignore
                root.tags = (root.tags || []).filter((tag) => usedTags.has(tag.name.toLowerCase()));
                return root;
              },
            },
          };
        },
      },
    },
  };
}
```

In summary, this code does the following:

1. Take the supplied ignore values (if there are any), convert them to lower case, and add them to the `usedTags` set so that they don't get removed.

2. Visit each operation in the description and add all tags used to the `usedTags` set.

3. Examine the tags declared in the OpenAPI document, and remove any that aren't found in the `usedTags` set.

To use the custom decorator, add configuration like the following to the `redocly.yaml` file:

```yaml
plugins:
  - ./tags.js

decorators:
  tags/no-unused-tags: on
```

If there are tags that should be preserved even though they are unused, add them to the ignore list:

```yaml
plugins:
  - ./tags.js

decorators:
  tags/no-unused-tags:
    ignore:
      - extra
      - KeepMe
```

Apply the decorator by running the bundle command:

```bash
redocly bundle openapi.yaml -o openapi-tidy.yaml
```

The new file `openapi-tidy.yaml` contains the API description with only the in-use and ignored tags included.

The checking is case-insensitive (it seems more likely to mistype a tag's case than to intentionally have two tags named the same with different case - although I'm sure both exist somewhere!).

## Examples

Start by adding the decorator to `redocly.yaml` and including some ignore settings:

```yaml
plugins:
  - ./tags.js

decorators:
  tags/no-unused-tags:
    ignore:
      - extra
      - KeepMe
```

Given an API description that uses only the `Products` and `Orders` tags, the tags section would be transformed to remove the other tags.

**Before bundling/decorating**:

```yaml
tags:
  - name: Products
    description: Operations related to products.
  - name: Statistics
    description: This tag isn't used by any of the endpoints, so that should be detected and corrected.
  - name: Extra
    description: This tag isn't used by any of the endpoints, but we're keeping it anyway.
  - name: Orders
    description: Order management operations.
```

Run the decorator and observe the API description tags section **after bundling/decorating**:

```yaml
tags:
  - name: Products
    description: Operations related to products.
  - name: Extra
    description: This tag isn't used by any of the endpoints, but we're keeping it anyway.
  - name: Orders
    description: Order management operations.
```

Use this decorator to tidy up when leftover tags remain in an OpenAPI description.

## References

- Inspired by [issue #953 on Redocly CLI](https://github.com/Redocly/redocly-cli/issues/953).
