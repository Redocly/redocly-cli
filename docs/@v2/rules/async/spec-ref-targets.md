---
slug: /docs/cli/rules/async/spec-ref-targets
---

# spec-ref-targets

Requires that `$ref`s in operations, replies, and channels point to the targets the AsyncAPI 3.0 specification requires.

| AsyncAPI | Compatibility |
| -------- | ------------- |
| 2.6      | ❌            |
| 3.0      | ✅            |
| 3.1      | ✅            |

The rule checks the `$ref` targets that AsyncAPI 3.0 restricts:

- An operation's `channel` must reference a channel from the root `channels` object (`#/channels/<name>`), not from `components`.
- An operation's `messages` must reference messages of the operation's referenced channel (`<channel-ref>/messages/<name>`), never `components.messages` directly.
- An operation reply's `channel` and `messages` follow the same requirements, with `messages` checked against the reply's channel.
- A channel's `servers` must reference servers from the root `servers` object (`#/servers/<name>`).

Some cases are exempt from these requirements:

- Operations and replies defined in `components` may reference any channel — the specification restricts only the ones defined in the root `operations` object.
- Channels defined in `components.channels` may reference any server.
- `$ref`s that point to other files are skipped: in multi-file documents they become internal pointers only after bundling.

## API design principles

These are MUST requirements in the AsyncAPI 3.0 specification — see the Operation Object, Operation Reply Object, and Channel Object sections.
A document that breaks them still resolves every `$ref`, so the mistake is easy to miss, but AsyncAPI tooling and renderers reject such documents.
This rule reports the misplaced references so you can fix them before they break downstream tools.

## Configuration

| Option   | Type   | Description                                                                               |
| -------- | ------ | ----------------------------------------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `warn` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  spec-ref-targets: error
```

## Examples

Given this configuration:

```yaml
rules:
  spec-ref-targets: error
```

Example of an **incorrect** operation — its `channel` and `messages` reference `components` directly:

```yaml
asyncapi: 3.0.0
info:
  title: Ping service
  version: 1.0.0
channels:
  ping:
    $ref: '#/components/channels/ping'
operations:
  sendPing:
    action: send
    channel:
      $ref: '#/components/channels/ping'
    messages:
      - $ref: '#/components/messages/ping'
components:
  channels:
    ping:
      address: ping
      messages:
        ping:
          $ref: '#/components/messages/ping'
  messages:
    ping:
      payload:
        type: string
```

Example of a **correct** operation — it references the root channel and that channel's messages:

```yaml
asyncapi: 3.0.0
info:
  title: Ping service
  version: 1.0.0
channels:
  ping:
    address: ping
    messages:
      ping:
        $ref: '#/components/messages/ping'
operations:
  sendPing:
    action: send
    channel:
      $ref: '#/channels/ping'
    messages:
      - $ref: '#/channels/ping/messages/ping'
components:
  messages:
    ping:
      payload:
        type: string
```

## Related rules

- [no-channel-trailing-slash](./no-channel-trailing-slash.md)
- [channels-kebab-case](./channels-kebab-case.md)
- [struct](../common/struct.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/async3/spec-ref-targets.ts)
- [AsyncAPI 3.0 Operation Object](https://www.asyncapi.com/docs/reference/specification/v3.0.0#operationObject)
