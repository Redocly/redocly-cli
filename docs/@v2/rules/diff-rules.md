---
slug: /docs/cli/rules/diff-rules
---

# Diff rules

The [`diff` command](../commands/diff.md) uses diff rules to judge the changes between two API descriptions.
A rule looks at one kind of change, such as a removed operation.
If the change can break a consumer, the rule reports it with a message, and the change gets the impact that you configure for the rule.

{% admonition type="warning" name="Experimental" %}
Diff rules are an experimental feature.
Their names, messages, and configuration can change in future releases.
{% /admonition %}

## `diff-recommended` ruleset

The `diff-recommended` ruleset turns on every diff rule with the `major` impact.
The `diff` command uses it when you have no `redocly.yaml` file.

If you have a `redocly.yaml` file, only the rules that it lists run.
To start from the ruleset, extend it:

```yaml
extends:
  - recommended
  - diff-recommended
```

## Configure diff rules

Set the impact of a rule in the [`diff` section](../configuration/reference/diff.md) of `redocly.yaml`.
The value is one of `major`, `minor`, `patch`, or `off`:

```yaml
extends:
  - diff-recommended
diff:
  enum-values-added: minor
  schema-format-changed: off
```

To turn off rules for one run, use the `--skip-rule` option:

```bash
redocly diff v1.yaml v2.yaml --skip-rule=enum-values-added
```

A rule from a [plugin](../custom-plugins/custom-diff-rules.md) has the plugin id in its name, for example `cafe/tag-removed`.

## Rules

Each rule applies to OpenAPI 3.x and to AsyncAPI 3, except the rules that name one of them.
An AsyncAPI 3 payload is a schema, so the schema rules judge it too.

### Requests and responses

The same change can break one side of an API and be safe for the other.
For example, a new `enum` value is safe in a request, but it can break a client that reads a response.
Thus, many rules look at the direction of the data:

- In OpenAPI, parameters and request bodies are requests, and responses are responses.
  Below `callbacks` and `webhooks`, the API sends the request, so the directions are the other way around.
- In AsyncAPI 3, an operation with `action: receive` gets requests, and an operation with `action: send` sends responses.
  A `reply` travels in the other direction.
- In OpenAPI, a schema with `readOnly: true` is response data only, and a schema with `writeOnly: true` is request data only.
- A component has the directions of the places that use it.
  If a request and a response use the same schema, the rules judge its changes for both.

### Operations, paths, and channels

| Rule                       | Reports                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| `path-removed`             | A removed path. OpenAPI only.                                                            |
| `operation-removed`        | A removed operation.                                                                     |
| `operation-action-changed` | An operation that now sends instead of receives, or the other way around. AsyncAPI only. |
| `channel-removed`          | A removed channel, or the removal of all channels. AsyncAPI only.                        |
| `channel-address-changed`  | A new `address` of a channel. AsyncAPI only.                                             |
| `server-removed`           | A removed server, or the removal of all servers of the document.                         |

In OpenAPI, a path or an operation that loses its own `servers` uses the servers of the document.
Thus, `server-removed` does not report the removal of that `servers` list.

### Parameters, requests, and responses

These rules apply to OpenAPI only.

| Rule                              | Reports                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `parameter-removed`               | A removed request parameter, or the removal of all parameters of an operation.                         |
| `parameter-became-required`       | A request parameter that clients must now send: a new required parameter, or one that is now required. |
| `parameter-serialization-changed` | A new `style`, `explode`, `allowReserved`, or `allowEmptyValue` value of a request parameter.          |
| `request-body-removed`            | A removed request body.                                                                                |
| `request-body-became-required`    | A request body that is now required.                                                                   |
| `response-removed`                | A removed response.                                                                                    |
| `response-header-removed`         | A removed response header, or the removal of all headers of a response.                                |
| `media-type-removed`              | A removed media type, for example `application/xml`, or the removal of all media types.                |

### Messages

These rules apply to AsyncAPI only.

| Rule                           | Reports                                                         |
| ------------------------------ | --------------------------------------------------------------- |
| `message-removed`              | A removed message, or the removal of all messages of a channel. |
| `message-content-type-changed` | A new `contentType` of a message.                               |

### Schemas

| Rule                            | Reports                                                                                                                                                              |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `property-removed`              | A removed property in a response, or the removal of all properties of a schema.                                                                                      |
| `required-properties-added`     | New `required` properties in a request.                                                                                                                              |
| `required-properties-removed`   | Properties that are no longer `required` in a response.                                                                                                              |
| `enum-values-removed`           | Removed `enum` values in a request.                                                                                                                                  |
| `enum-values-added`             | New `enum` values in a response.                                                                                                                                     |
| `schema-type-changed`           | A `type` that accepts less in a request, or more in a response.                                                                                                      |
| `numeric-range-changed`         | A change to `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, or `multipleOf`.                                                                           |
| `string-constraint-changed`     | A change to `minLength`, `maxLength`, or `pattern`.                                                                                                                  |
| `schema-format-changed`         | A change to `format`.                                                                                                                                                |
| `additional-properties-changed` | A change to `additionalProperties`.                                                                                                                                  |
| `schema-combinator-changed`     | A removed `oneOf` or `anyOf` subschema in a request, or a new one in a response. A new `allOf` subschema in a request, or a removed one in a response. OpenAPI only. |

The `numeric-range-changed`, `string-constraint-changed`, `schema-format-changed`, and `additional-properties-changed` rules report a change that accepts fewer values in a request, or more values in a response.

### Security and references

| Rule                           | Reports                                                                                                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `security-requirement-changed` | A `security` list that clients can no longer pass: authentication where there was none, a new scheme or new scopes in a requirement, or a removed alternative. OpenAPI only. |
| `security-scheme-changed`      | A new `type`, `scheme`, `in`, `name`, `bearerFormat`, or `openIdConnectUrl` of a security scheme. OpenAPI only.                                                              |
| `security-scheme-removed`      | A removed security scheme. OpenAPI only.                                                                                                                                     |
| `ref-target-changed`           | A `$ref` that points to another target, which describes other data.                                                                                                          |
