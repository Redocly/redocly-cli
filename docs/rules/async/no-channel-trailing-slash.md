# no-channel-trailing-slash

Channel names must not have trailing slashes in their address.

| AsyncAPI | Compatibility |
| -------- | ------------- |
| 2.0      | ✅            |
| 3.0      | ✅            |

## API design principles

Channel names must not have trailing slashes in their address.

## Configuration

| Option   | Type   | Description                                             |
| -------- | ------ | ------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `off`. |

An example configuration:

```yaml
rules:
  no-channel-trailing-slash: error

```

## Examples

Given the following configuration:

```yaml
rules:
  no-channel-trailing-slash: error
```

Example of an **incorrect** channel:

```yaml
channels:
  channel1:
    address: /trailing/
    payload:
      type: object
```

Example of a **correct** channel:

```yaml
channels:
  channel1:
    address: /expected
    payload:
      type: object
```

## Resources

- [Rule source async3](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/async3/no-channel-trailing-slash.ts)
- [Rule source async2](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/async2/no-channel-trailing-slash.ts)
