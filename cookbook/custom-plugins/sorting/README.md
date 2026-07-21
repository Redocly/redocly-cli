# A suite of sorting decorators

Authors:

- [`@lornajane`](https://github.com/lornajane), Lorna Mitchell (Redocly)

## What this does and why

There are lots of reasons that you'd want to alter the order of the items in your API description, such as putting required fields first, or just ordering things alphabetically (or logically!) to make things consistent and easier to find.
When Redocly only made API documentation tools, the sorting changes were made as part of the docs build.
But now we make more complex tools, and many API pipelines have more than just docs in them too - so these operations are more commonly done with a decorator to transform the API description; then it can be used with any tools.

Redocly CLI has a [`tags-alphabetical`](https://redocly.com/docs/cli/rules/tags-alphabetical) rule to error if the `tags` section isn't in alphabetical order by `name`.
This plugin adds some additional _rules_ for checking sort orders.

- `method-sort` rule to put your methods in the desired order. The default is `["post", "patch", "put", "get", "delete"]`, but you can supply your own with an `order` parameter.
- `property-sort` rule to sort properties either alphabetically with `order: alpha` (the default sort order for this rule) or with `order: required` to put the required properties first.

The plugin also includes _decorators_ to sort your OpenAPI descriptions, perhaps to allow an existing OpenAPI description to be easily updated to meet the expectations of the sorting rules.
Here's a full list of the sorting features:

- `methods`: sorts methods consistently in the order you supply (or `GET`, `POST`, `PUT`, `PATCH` and `DELETE` by default), with any unsorted methods appended afterwards
- `enums-alphabetical`: sorts the options for an enum field alphabetically
- `properties-alphabetical`: sorts object properties in schemas alphabetically
- `properties-required-first`: puts the required properties at the top of the list (run this _after_ any other property sorting decorators)
- `tags-alphabetical`: sorts tags alphabetically

## Code

Here's the main plugin entrypoint, it's in `sorting.js`:

```javascript
import SortTagsAlphabetically from './sort-tags';
import SortEnumsAlphabetically from './sort-enums';
import SortMethods from './sort-methods';
import SortPropertiesAlphabetically from './sort-props-alpha';
import SortPropertiesRequiredFirst from './sort-props-required';
import RuleSortMethods from './rule-sort-methods';
import RuleSortProps from './rule-sort-props';

export default function Sorting() {
  return {
    id: 'sorting',
    rules: {
      oas3: {
        'method-sort': RuleSortMethods,
        'property-sort': RuleSortProps,
      },
    },
    decorators: {
      oas3: {
        'tags-alphabetical': SortTagsAlphabetically,
        'enums-alphabetical': SortEnumsAlphabetically,
        methods: SortMethods,
        'properties-alphabetical': SortPropertiesAlphabetically,
        'properties-required-first': SortPropertiesRequiredFirst,
      },
    },
  };
}
```

Each of the available rules/decorators is in its own file, rather than copying them here, you can view them in the same directory as this `README`:

- [rule-sort-methods.js](./rule-sort-methods.js)
- [rule-sort-props.js](./rule-sort-props.js)
- [sort-tags.js](./sort-tags.js)
- [sort-enums.js](./sort-enums.js)
- [sort-methods.js](./sort-methods.js)
- [sort-props-alpha.js](./sort-props-alpha.js)
- [sort-props-required.js](./sort-props-required.js)

You can copy or adapt the plugins here to meet your own needs, changing the sorting algorithms or sorting different fields.
One thing to look out for is that if you need to re-order the properties of an object, then you should visit the parent of the object, and assign the new object to the key that should be updated.

## Examples

Add the plugin to `redocly.yaml` and enable the decorators and/or rules:

```yaml
plugins:
  - sorting.js

decorators:
  sorting/methods: on
    order: [delete, get]
  sorting/tags-alphabetical: on
  sorting/enums-alphabetical: on
  sorting/properties-alphabetical: on
  sorting/properties-required-first: on

rules:
  sorting/method-sort:
    severity: error
    order: [get, post, delete]
  sorting/property-sort:
    severity: warn
    type: required # default is alpha

```

### Lint with rules

Run the [lint command](https://redocly.com/docs/cli/commands/lint) and the rules are used during linting.
Your command will look something like the following example:

```bash
redocly lint openapi.yaml
```

If your OpenAPI doesn't fulfil the criteria in the configured rules, the details of the warnings/errors are shown in the output.

Adjust the rule configuration or severity levels to meet your needs, and let us know if there's some other rules you'd like to see included.

### Bundle with decorators

Run the [bundle command](https://redocly.com/docs/cli/commands/bundle) and the decorators are applied during bundling.
Your command will look something like the following example:

```bash
redocly bundle openapi.yaml -o updated-openapi.yaml
```

Use your favorite "diff" tool to look at the changes made between your existing API description and the updated version.

Remove or turn off any of the decorators that don't fit your use case, and let us know if there are any other sorting features you need by opening an issue on this repository.

## References

- [`tags-alphabetical' rule](https://redocly.com/docs/cli/rules/tags-alphabetical)
