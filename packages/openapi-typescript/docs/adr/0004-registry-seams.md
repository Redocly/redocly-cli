# ADR 0004: First-party `getGenerator` / `getWriter` registry seams

- Status: Accepted
- Date: 2026-06-10

## Context

The package needs to vary two things independently: **what** is generated (the SDK, plus optional feature outputs like zod schemas or framework hooks) and **how** files are laid out (single file, split, per-tag, …).
We want these to be extensible internally without committing — yet — to a public plugin API and its long-term compatibility surface.

## Decision

We expose two internal **registry seams**, each mapping a name to an implementation:

- **`getGenerator(name)`** → `Generator` (`(input) => GeneratedFile[]`). `generateClient` runs the configured generators (default `['sdk']`), merging their files (duplicate output paths throw). New capabilities (zod, tanstack-query, transformers, …) plug in here. The `sdk` generator delegates to the writer seam below.
- **`getWriter(outputMode)`** → `Writer`. Adapters for `single` / `split` / `tags` / `tags-split` (the two tag layouts share `buildTaggedClient`). New file layouts plug in here.

Both are **first-party only** — no public third-party plugin API yet.

## Consequences

- New generators and layouts are added by registering an implementation, not by editing call sites.
- Writers consume the emitter only through the `emitModules(...) → ClientModules` seam, so they stay layout-only and the emitter's internal fragment breakdown never leaks.
- Deferring a public plugin API keeps us free to change `Generator`/`Writer` internals; third-party extensibility is a deliberate later step, revisited once the first-party set stabilizes.