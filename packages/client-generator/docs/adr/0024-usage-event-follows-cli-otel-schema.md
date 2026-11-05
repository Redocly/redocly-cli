# ADR 0024: The usage telemetry event follows the CloudEvent schema of @redocly/cli-otel

- Status: Accepted
- Date: 2026-11-05
- Amends: [ADR-0023](./0023-usage-telemetry-across-languages.md) (point 3)

## Context

ADR 0023 gave every SDK language one usage event, but only the TypeScript module defined its shape.
Redocly telemetry events follow one CloudEvent structure: `data` is a list of resources, each with `id`, `object`, and `uri`, and `source`, `origin`, and the event ID have fixed formats.
`@redocly/cli-otel` holds the types and the OpenTelemetry mapper that come from the AsyncAPI description of these events, and the CLI already sends its `com.redocly.command.ran` event through them.
The SDK usage event did not follow that structure: its `data` was an object with a `usage` and an `sdk` map.
A generated SDK has no dependencies, so it cannot import the package.

## Decision

1. **The event is the `com.redocly.sdkUsage.aggregated` CloudEvent of `@redocly/cli-otel`.**
   `data` holds the operation with its counts, then the SDK.
   `source` is `urn:redocly:cli`, `origin` is `redocly-sdk`, and the ID is `evt_` and a lowercase ULID.
   The module does not send `env`: the OpenTelemetry collector sets it.
2. **The attributes of each span are what `processCloudEventAttributes` of `@redocly/cli-otel` gives for the event.**
3. **The TypeScript module types its event with the message type of the package.**
   The prepare script replaces the type import with the declarations, so the generated module still has no dependencies, and strict `tsc` on a generated client checks the module against the schema.
4. **The Go, Python, and PHP modules build the same event by hand.**
   The end-to-end test of each language compares every span attribute with the mapper output for the expected event.

## Consequences

- A change to the event starts in the AsyncAPI description.
  When a new `@redocly/cli-otel` changes the event, the type check or the end-to-end tests fail until the four modules follow.
- The attribute keys changed: the counts moved from `cloudevents.event_data.usage.*` to `cloudevents.event_data.operation.*`, and `cloudevents.event_data.sdk.name` became `cloudevents.event_data.sdk.id`.
  A query on the old keys reads only the events of SDKs generated before this change.
- Point 3 of ADR 0023 changes: the `uri` fields hold the language, so they differ between languages too, beside `sdk.language`, `sdk.runtime`, and `sdk.runtime_version`.
- A custom `sink` receives the CloudEvent, so a sink that read `data.usage` must read the first item of `data`.
- The generated TypeScript module carries the type declarations of the event, about 190 lines.
- The type import names a file inside the package, because the package root reaches its types through paths without an extension, which `nodenext` cannot resolve.
