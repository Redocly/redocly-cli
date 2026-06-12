---
seo:
  title: Lint GraphQL with Redocly CLI
  description: Use the Redocly CLI to validate GraphQL SDL schemas, or configure rules for GraphQL.
---

# Lint GraphQL with Redocly CLI

{% admonition type="warning" name="Experimental GraphQL support" %}
This feature is at an early stage, please use with caution and send us feedback!
GraphQL support is experimental and its behavior, rules, and configuration may change in future releases.
{% /admonition %}

In addition to providing lint functionality for multiple OpenAPI formats, Redocly CLI also has experimental support for GraphQL.
Redocly CLI supports the following linting approaches with GraphQL documents:

- GraphQL SDL syntax and schema validation.
- Built-in rules for checking common standards requirements (see the [list of GraphQL rules](#graphql-rules)).
- [Configurable rules](../rules/configurable-rules.md) so that you can build your own rules following common patterns.

## Lint an existing GraphQL file

Redocly CLI takes its settings from a `redocly.yaml` configuration file.
Below is an example of a simple configuration file for validating that a GraphQL SDL file is well-formed and structurally valid:

```yaml
rules:
  struct: error
```

The `struct` rule reports an error if the SDL contains a syntax error or if the schema is structurally invalid (for example, a field that references a type that isn't defined).

With this configuration file, and your GraphQL schema file, run the linting command:

```sh
redocly lint schema.graphql
```

The output describes any structural problems with the document, or reports that it is valid.

{% admonition type="info" name="Syntax errors always stop linting" %}
A GraphQL syntax error is always reported as an error and short-circuits linting for that file, regardless of how `struct` is configured.
{% /admonition %}

## GraphQL rules

To expand the linting checks for a GraphQL schema, enable the built-in GraphQL rules.
Unlike the shared `struct` rule (configured under `rules`), GraphQL-specific built-in rules are configured under the `graphqlRules` section.
The currently supported rules are:

- `no-unused-types`: Every declared type must be referenced by another type, directive, or operation (or be a root operation type: `Query`, `Mutation`, or `Subscription`). Types that are declared but never referenced are reported. If the document has no root operation type, this rule reports nothing.
- `type-description`: Every type definition (object, interface, enum, input object, union, and scalar) must have a non-empty description.

We expect the list to expand over time, so keep checking back - and let us know if you have any requests by [opening an issue on the GitHub repo](https://github.com/Redocly/redocly-cli/issues).

To use a rule, add its name to the `graphqlRules` configuration section (or just under the `rules` section if you don't need a clear separation), and declare the severity level (either `error`, `warn`, or `off`):

```yaml
rules:
  struct: error
graphqlRules:
  type-description: warn
```

## Configurable rule example

Redocly CLI also offers [configurable rules](../rules/configurable-rules.md) that allow you to set assertions about the document being linted.
This functionality works for GraphQL too.
Instead of OpenAPI node types, the `subject.type` targets GraphQL AST node kinds, such as `ObjectTypeDefinition`, `FieldDefinition`, `EnumTypeDefinition`, or `ScalarTypeDefinition`.

The following example shows a configurable rule that displays a warning when an object type name is not in `PascalCase`:

```yaml
rules:
  rule/graphql-type-casing:
    subject:
      type: ObjectTypeDefinition
    assertions:
      casing: PascalCase
    severity: warn
```

With the extensive configurable rules options available, there are many opportunities to make sure that your GraphQL schema conforms with expectations.
We'd also love to see what you're building - it helps us know how things are going!
