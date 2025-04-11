# channels-kebab-case

Channel address should be `kebab-case` (lowercase with hyphens).

| AsyncAPI | Compatibility |
| -------- | ------------- |
| 2.6      | ✅            |
| 3.0      | ✅            |

## API design principles

Using consistent casing for the channel address provides a better developer experience and a more predictable experience overall.

## Configuration

| Option   | Type   | Description                                             |
| -------- | ------ | ------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `off`. |

An example configuration:

```yaml
rules:
  channels-kebab-case: error
```

## Examples

Given the following configuration:

```yaml
rules:
  channels-kebab-case: error
```

Example of an **incorrect** channel:

```yaml
channels:
  ticketSales:
    address: transactions/ticketSales # channel address value checked by rule
    messages:
      ticketSaleTransaction:
        $ref: '#/components/messages/ticketSaleTransaction'
```

Example of a **correct** channel:

```yaml
channels:
  ticketSales:
    address: transactions/ticket-sales # channel address value checked by rule
    messages:
      ticketSaleTransaction:
        $ref: '#/components/messages/ticketSaleTransaction'
```

### Channel rules for AsyncAPI 2.6

The syntax for how the channels are described changed with the AsyncAPI 3.0 release.
This rule also works with AsyncAPI 2.6 and checks the channel address used as the key of the `channels` object.
For example, the rule would catch this example where `transactions/ticketSales` is used as a channel name:

```yaml
channels:
  transactions/ticketSales: # channel address value checked by rule
    subscribe:
      message:
        $ref: '#/components/messages/ticketSaleTransaction'
```

Change the channel name to `transactions/ticket-sales` to comply with this rule.

## Resources

- [Rule source async3](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/async3/channels-kebab-case.ts)
- [Rule source async2](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/async2/channels-kebab-case.ts)
