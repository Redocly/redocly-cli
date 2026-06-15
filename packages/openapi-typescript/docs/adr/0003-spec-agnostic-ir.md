# ADR 0003: A spec-agnostic IR as the builder↔emitter contract

- Status: Accepted
- Date: 2026-06-10

## Context

The generator must support multiple input dialects (OpenAPI 3.0/3.1/3.2 and Swagger 2.0) and multiple
output shapes. If emitters read the raw OpenAPI document directly, every emitter would have to handle
every spec quirk and version difference, and adding a dialect or an output target would ripple across
the whole codebase.

## Decision

We interpose a **spec-agnostic intermediate representation** (`ir/model.ts`) between parsing and
emission. `buildApiModel` (`ir/build.ts`) walks the (bundled, ref-preserved) document once and produces
the IR; Swagger 2.0 is first normalized to the 3.x shape (`ir/normalize-swagger2.ts`) so the builder
sees one shape. **Everything downstream reads the IR, never the raw spec.** The IR is a pure type model
— no runtime code — and is the contract between the builder and the emitters.

## Consequences

- A new input dialect is absorbed in one place (normalize + build); emitters are untouched.
- A new output target (e.g. another language) can be written against the IR without re-parsing specs —
  the IR is the seam that makes multi-language plausible.
- The IR must stay genuinely spec-agnostic; leaking OpenAPI-isms into it would erode the boundary. New
  schema kinds are added to `SchemaModel` and produced in the builder, then consumed by emitters.
