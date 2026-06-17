---
seo:
  title: Lint GraphQL with Redocly CLI
  description: Use the Redocly CLI to validate GraphQL SDL schemas, or configure rules for GraphQL.
---

# Lint GraphQL with Redocly CLI

{% admonition type="warning" name="Experimental" %}
This is an experimental feature. Its behavior may change in future releases.
{% /admonition %}

In addition to providing lint functionality for multiple OpenAPI formats, Redocly CLI also supports GraphQL.
Redocly CLI supports the following linting approaches with GraphQL documents:

- GraphQL SDL syntax and schema validation
- built-in rules for checking common standards requirements (see the [list of GraphQL rules](#graphql-rules))
- [configurable rules](../rules/configurable-rules.md) for building rules following common patterns

## Lint an existing GraphQL file

Redocly CLI takes its settings from a `redocly.yaml` configuration file.
The following is an example of a simple configuration file that checks if a GraphQL SDL file is well-formed and has a valid structure:

```yaml
rules:
  struct: error
```

The `struct` rule reports an error if the SDL contains a syntax error or if the schema is structurally invalid (for example, a field that references a type that isn't defined).

With this configuration file, and your GraphQL schema file, run the linting command:

```sh
redocly lint schema.graphql
```

The output describes structural problems with the document, or reports that it is valid.

{% admonition type="info" name="Syntax errors always stop linting" %}
A GraphQL syntax error is always reported as an error and ends linting for that file, regardless of how `struct` is configured.
{% /admonition %}

## GraphQL rules

The supported rules are:

- `struct`: Ensures that the GraphQL SDL is well-formed and that the schema is structurally valid.
- `no-unused-types`: Every declared type must be referenced by another type or directive, or serve as a root operation type.
  Root types are the ones named in the `schema` definition or its extensions; when there is no `schema` definition, types named `Query`, `Mutation`, or `Subscription` are the roots.
  Types that are declared but never referenced are reported.
  If the document has no root operation type, this rule reports nothing.
- `type-description`: Every type definition (object, interface, enum, input object, union, and scalar) must have a non-empty description.

We expect the list to expand over time, so keep checking back - and let us know if you have any requests by [opening an issue on the GitHub repo](https://github.com/Redocly/redocly-cli/issues).

The rules are available in our predefined rulesets.
To tweak a rule's severity, configure it in your `redocly.yaml` file, for example:

```yaml
rules:
  type-description: error
```

## Configurable rule example

Redocly CLI also offers [configurable rules](../rules/configurable-rules.md) that enable you to set assertions about the document being linted.
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
