---
"@redocly/openapi-core": minor
"@redocly/cli": minor
---

Enabled `no-required-schema-properties-undefined`, `no-schema-type-mismatch`, and `no-enum-type-mismatch` rules for **AsyncAPI** and **Arazzo** specifications.
Adjusted the rules' severities in the `recommended` and `minimal` rulesets. Refer to the following table:

| Rule \ Ruleset                          | recommended       | minimal         |
| --------------------------------------- | ----------------- | --------------- |
| no-required-schema-properties-undefined | `off` -> `warn`   | `off` -> `warn` |
| no-enum-type-mismatch                   | `error`           | `warn`          |
| no-schema-type-mismatch                 | `warn` -> `error` | `off` -> `warn` |
