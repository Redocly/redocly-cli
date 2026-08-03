---
'@redocly/client-generator': patch
'@redocly/cli': patch
---

Added coarse usage telemetry for the eject workflow (respecting the `REDOCLY_TELEMETRY` opt-out, documented on the usage-data page): `eject-generator`/`scaffold-generator` report the action and outcome category (such as clean or conflicted `--update` merges), `generate-client` reports the built-in origin and ejected-from version of path generators that carry the eject provenance header, and a generator that throws during a run is now reported as the `generator-run` error category with the failing generator named in the CLI error message. File contents, paths, and user-chosen names are never transmitted.
