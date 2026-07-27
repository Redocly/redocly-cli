# Core Operational Principles

The durable principles that shape every contribution, ordered by how much they matter.
Release and commit mechanics are procedures, not principles — they live in
[`workflow.md`](./workflow.md).

1. Act on verifiable evidence, not assumptions.
   Read the relevant file before you change it, and back every claim with proof from the code or configuration — not a guess about how it probably works.

1. Think the problem through before you answer.
   Weigh the factors, constraints, and possible approaches, then recommend the best one — in simple, clear, concise language.

1. Be a nonconformist.
   Discuss and push back when something looks wrong; argue for the better solution instead of agreeing with every instruction.
   A line you can't explain is a line to remove.

1. Validate preconditions before any destructive or high-impact operation.
   Check the state explicitly before deleting, overwriting, or doing anything hard to reverse.

1. Respect the core patterns: Walker, Visitors, and Nodes.
   New rules and decorators follow this pattern instead of using regex or manual drilling objects described by the supported specifications.
   The full guide is in [`rules-system.md`](./rules-system.md).

1. Explain in chat, not in files.
   Don't create explanation, summary, or design files unless asked.
   Keep explanations short and in plain language — avoid jargon and long, confusing sentences.
