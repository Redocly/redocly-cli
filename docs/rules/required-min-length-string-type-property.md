# required-min-length-string-type-property

Requires that every required property in the API definition with type `string` has a `minLength`. 

|OAS|Compatibility|
|---|---|
|2.0|✅|
|3.0|✅|
|3.1|✅|

## API design principles

The `minLength` property is useful in scenarios where you need to specify a minimum length requirement for a string or to check if the string is not empty, especially if the property is marked as `required`. It helps to prevent errors or unexpected behavior in your application that may result from having strings that are too short or even empty. By setting a minimum length, you can ensure that the string has enough characters to be useful in your application. Overall, using the `minLength` property for string type properties in OAS definitions is a best practice for ensuring data integrity and improving the overall quality of the API.

## Configuration

To configure the rule, add it to the `rules` object in your configuration file.
Set the desired [severity](/docs/cli/rules.md#severity-settings) for the rule.

```yaml
rules:
  required-min-length-string-type-property:
    severity: error
```

## Configuration


|Option|Type|Description|
|---|---|---|
|severity|string|Possible values: `off`, `warn`, `error`. Default `off` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  required-min-length-string-type-property: error
```

## Examples


Given this configuration:

```yaml
rules:
  required-min-length-string-type-property: error
```

Example of an **incorrect** schema:

```yaml Bad example
schemas:
  User:
    type: object
    required:
        - name 
    properties:
      name:
        description: User name
        type: string
        
```

Example of a **correct** schema:


```yaml Good example
schemas:
  User:
    type: object
    required:
        - name 
    properties:
      name:
        description: User name
        type: string
        minLength: 2
```

## Related rules

- [no-invalid-schema-examples](./no-invalid-schema-examples.md)
- [response-contains-property](./response-contains-property.md)
- [Custom rules](./custom-rules.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/required-min-length-string-type-property.ts)
- [Schema docs](https://redocly.com/docs/openapi-visual-reference/schemas/)
