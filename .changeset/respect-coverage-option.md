---
'@redocly/respect-core': minor
'@redocly/cli': minor
---

Added the experimental `--coverage` option to the `respect` command.
After the run, Respect shows how many operations, parameters, schema properties, and response codes of each OpenAPI source description the executed steps covered, and lists the operations that no step called.
With `--verbose`, Respect lists the covered and the not covered items of every operation.
With `--json-output`, the covered and the missing items of every operation are saved in the JSON logs.
