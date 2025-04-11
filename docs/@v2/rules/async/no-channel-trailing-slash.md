# no-channel-trailing-slash

Channel names must not have trailing slashes in their address.

| AsyncAPI | Compatibility |
| -------- | ------------- |
| 2.6      | ✅            |
| 3.0      | ✅            |

## API design principles

Depending on the protocol, the trailing slash may indicate an error or simple inconsistency between channels or documentation.
Enable this rule to make sure that no channel address includes the trailing slash.

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
    address: events/trailing/
    messages:
      event1:
        $ref: '#/components/messages/event1'
```

Example of a **correct** channel:

```yaml
channels:
  channel1:
    address: events/expected
    messages:
      event1:
        $ref: '#/components/messages/event1'
```

### Channel rules for AsyncAPI 2.6

The syntax for how the channels are described changed with the AsyncAPI 3.0 release.
This rule also works with AsyncAPI 2.6 and checks the channel address used as the key of the `channels` object.
For example, the rule produces an error when it sees this channel with a trailing slash:

```yaml
channels:
  events/trailing/: # channel address value checked by rule
    subscribe:
      message:
        $ref: '#/components/messages/event1'
```

Change the channel name to `events/expected` (or another value without a trailing slash) to comply with this rule.

## Resources

- [Rule source async3](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/async3/no-channel-trailing-slash.ts)
- [Rule source async2](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/async2/no-channel-trailing-slash.ts)
