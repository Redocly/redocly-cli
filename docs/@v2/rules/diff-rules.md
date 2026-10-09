---
slug: /docs/cli/rules/diff-rules
---

# Diff rules

The [`diff` command](../commands/diff.md) uses diff rules to find the changes that can break a client.
Each rule finds one type of change, for example a removed operation.
When a rule finds a change, the rule shows a message, and the change gets the impact that you set for the rule.

{% admonition type="warning" name="Experimental" %}
Diff rules are an experimental feature.
Their names, messages, and configuration can change in future releases.
{% /admonition %}

## `diff-recommended` ruleset

The `diff-recommended` ruleset turns on all diff rules with the `major` impact.
The `diff` command uses this ruleset if you do not have a `redocly.yaml` file.

If you have a `redocly.yaml` file, only the rules from that file run.
To use the ruleset, add it to `extends`:

```yaml
extends:
  - recommended
  - diff-recommended
```

## Configure diff rules

Set the impact of a rule in the [`diff` section](../configuration/reference/diff.md) of `redocly.yaml`.
The impact is `major`, `minor`, `patch`, or `off`:

```yaml
extends:
  - diff-recommended
diff:
  enum-values-added: minor
  schema-constraint-changed: off
```

To turn off rules for one run, use the `--skip-rule` option:

```bash
redocly diff v1.yaml v2.yaml --skip-rule=enum-values-added
```

## Requests and responses

Many rules check the direction of the data, because a change can break one direction only.
For example, a new `enum` value is safe in a request, but it can break a client that reads a response.

- OpenAPI: parameters and request bodies are requests, and responses are responses.
  In `callbacks` and `webhooks`, the API sends the request, so the directions are opposite.
- AsyncAPI 3: the messages of an operation with `action: receive` are requests, and the messages of an operation with `action: send` are responses.
  A `reply` has the opposite direction.
- A schema with `readOnly: true` is response data, and a schema with `writeOnly: true` is request data.
- A component has the directions of all places that use it.
  If a request and a response use the same schema, the rules check its changes in both directions.
  A component that nothing uses has no direction.

## Rules

The rules apply to OpenAPI 3.x and AsyncAPI 3, except the rules that name one of them.

### Paths, operations, and servers

| Rule                       | Reports                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| `path-removed`             | A removed or renamed path, or a removed webhook, callback, or callback URL. OpenAPI only.    |
| `operation-removed`        | A removed operation.                                                                         |
| `operation-id-changed`     | A changed or removed `operationId`. Generated clients use it as a method name. OpenAPI only. |
| `operation-action-changed` | A changed `action` of an operation. AsyncAPI only.                                           |
| `server-removed`           | A removed server, or a changed `url`, `host`, `pathname`, or `protocol` of a server.         |

### Channels and messages

These rules apply to AsyncAPI only.

| Rule                           | Reports                               |
| ------------------------------ | ------------------------------------- |
| `channel-removed`              | A removed channel.                    |
| `channel-address-changed`      | A changed `address` of a channel.     |
| `message-removed`              | A removed message.                    |
| `message-content-type-changed` | A changed `contentType` of a message. |

### Parameters, request bodies, and responses

These rules apply to OpenAPI only.

| Rule                              | Reports                                                                             |
| --------------------------------- | ----------------------------------------------------------------------------------- |
| `parameter-removed`               | A removed or renamed parameter, or a changed `in` of a parameter.                   |
| `parameter-became-required`       | A new required parameter, or a parameter that became required.                      |
| `parameter-serialization-changed` | A changed `style`, `explode`, `allowReserved`, or `allowEmptyValue` of a parameter. |
| `request-body-removed`            | A removed request body.                                                             |
| `request-body-became-required`    | A request body that became required.                                                |
| `response-removed`                | A removed response, or a changed status code of a response.                         |
| `response-header-removed`         | A removed or renamed response header.                                               |
| `media-type-removed`              | A removed or renamed media type.                                                    |

### Schemas

| Rule                          | Reports                                                                                                                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `property-removed`            | A removed or renamed property in a response.                                                                                                                                            |
| `required-properties-added`   | Properties that became required in a request.                                                                                                                                           |
| `required-properties-removed` | Properties that are no longer required in a response.                                                                                                                                   |
| `enum-values-removed`         | Removed `enum` values in a request.                                                                                                                                                     |
| `enum-values-added`           | New `enum` values in a response.                                                                                                                                                        |
| `schema-type-changed`         | A changed `type` or `nullable` that accepts fewer types in a request, or more types in a response.                                                                                      |
| `schema-constraint-changed`   | A changed constraint that accepts fewer values in a request, or more values in a response.                                                                                              |
| `schema-combinator-changed`   | An added or removed subschema of `allOf`, `anyOf`, or `oneOf`, or an added or removed list of them, that accepts fewer values in a request, or more values in a response. OpenAPI only. |

`schema-constraint-changed` checks these keywords:

- Limits: `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `minLength`, `maxLength`, `minItems`, `maxItems`, `minProperties`, `maxProperties`.
- Values: `multipleOf`, `pattern`, `format`, `const`, `contentEncoding`, `contentMediaType`.
  The rule cannot compare two values of these keywords, so it reports a changed value in both directions.
- Flags: `uniqueItems: true`, and `false` for `additionalProperties`, `items`, `unevaluatedItems`, or `unevaluatedProperties`.
- Subschemas: `not`, `then`, `else`, `contains`, `propertyNames`, `items`, `prefixItems`, `additionalProperties`, `unevaluatedItems`, `unevaluatedProperties`, `dependentSchemas`, `dependentRequired`.

### Security

These rules apply to OpenAPI only.

| Rule                           | Reports                                                                                                                                      |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `security-requirement-changed` | A `security` change that a client with the old credentials cannot pass: new authentication, a new scheme or scope, or a removed requirement. |
| `security-scheme-changed`      | A removed security scheme, or a changed `type`, `scheme`, `in`, `name`, `bearerFormat`, or `openIdConnectUrl` of a security scheme.          |

## Changes that the rules do not report

These changes do not break a client:

- A renamed path variable, for example `/menu/{id}` to `/menu/{itemId}`, and the renamed path parameter.
- A renamed webhook. Its key is only a name for the documentation.
- A changed case of a header name.
- A removed `servers` list of a path or an operation. The path or operation then uses the servers of the document.
- A new `operationId` where there was none.
