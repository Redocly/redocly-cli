# Decorator to sort tags in an API description

Authors:

- [`@lornajane`](https://github.com/lornajane), Lorna Mitchell (Redocly)

## What this does and why

Redocly CLI has the [`tags-alphabetical`](https://redocly.com/docs/cli/rules/tags-alphabetical/) rule to error if the `tags` section isn't in alphabetical order by `name`.

This decorator provides functionality to _put_ the tags in order by name, in order to make any API description compatible with that rule.

## Code

Here's the main plugin entrypoint, it's in `tag-sorting.js`:

```javascript
import SortTagsAlphabetically from './decorator-alpha';

export default function tagSortingPlugin() {
  return {
    id: 'tag-sorting',
    decorators: {
      oas3: {
        alphabetical: SortTagsAlphabetically,
      },
    },
  };
}
```

The code here sets the plugin name to `tag-sorting` and adds a decorator for OpenAPI 3 called `alphabetical`.

The functionality for the alphabetical sorting is in `decorator-alpha.js`:

```javascript
export default function SortTagsAlphabetically() {
  console.log('re-ordering tags: alphabetical');
  return {
    TagList: {
      leave(target) {
        target.sort((a, b) => {
          if (a.name < b.name) {
            return -1;
          }
          if (a.name > b.name) {
            return 1;
          }
          return 0;
        });
      },
    },
  };
}
```

It operates on the `TagList` element, since it needs to shuffle the child entries inside it. A simple comparison of the name field is used to sort the items.

## Examples

Add the plugin to `redocly.yaml` and enable the decorator:

```yaml
plugins:
  - ./tag-sorting.js

decorators:
  tag-sorting/alphabetical: on
```

Now with an OpenAPI description that has more than one tag listed at the top level, the decorator will re-order the entries.

**Before**:

```yaml
tags:
  - name: Products
    description: Operations related to products.
  - name: Orders
    description: Order management operations.
```

**After**:

```yaml
tags:
  - name: Orders
    description: Order management operations.
  - name: Products
    description: Operations related to products.
```

## References

- [`tags-alphabetical` rule](https://redocly.com/docs/cli/rules/tags-alphabetical/)
- The [`tags` types documentation](https://redocly.com/docs/openapi-visual-reference/tags/#types)
