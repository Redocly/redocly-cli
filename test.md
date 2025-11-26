# Define Scorecards

Scorecards are defined in the `redocly.yaml` file.

## Configuration

Each scorecard is configured in the `scorecards` section.

**Note:** If you're using the legacy `scorecard` section in your `redocly.yaml` file, rename it to `scorecardClassic`. The new `scorecards` section (plural) provides enhanced functionality.

```yaml
scorecards:
  - name: Dora Metrics
    description: This scorecard measures each service's operational readiness using the DORA framework.
    entities:
      - field: type
        operator: eq
        value: api-description
      - field: metadata.specType
        operator: eq
        value: openapi
    levels:
      - name: Bronze
        extends: # backwards compatibility with the old scorecard configuration of rulesets
          - minimal
      - name: Silver
        extends: # backwards compatibility with the old scorecard configuration of rulesets
          - ./api-ruleset-silver.yaml
        rules:
          no-ambiguous-paths: error # backwards compatibility with the old scorecard configuration of defined rules, for OpenAPI/AsyncAPI descriptions only
          no-invalid-schema-examples: error # by default weight is 1
          spec-strict-refs:
            severity: error
            weight: 4
          paths-kebab-case:
            severity: error
            weight: 2
      - name: Gold
        rules:
          no-ambiguous-paths: error
          no-invalid-schema-examples: error
          rule/has_title:  # new rule for entities
              title: Has title
              subject:
                type: Entity
                property: title
              severity: error
              message: Entity must have a title
              assertions:
                defined: true
                nonEmpty: true
              weight: 2
          rule/has_on_call:  # new rule for entities
              title: Has on-call
              subject:
                type: Entity
                property: metadata.onCall
              severity: error
              message: Entity `metadata.onCall` should be defined and not empty when open incidents are greater than 0
              assertions:
                defined: true
              where:
                - subject:
                    type: Entity
                    property: metadata.openedIncidents
                  assertions:
                    gt: 0
              weight: 2
          rule/has_owner:  # new rule for entities
              title: Has owner
              subject:
                type: Entity
                property: relations.ownedBy
              severity: error
              message: Entity `relations.ownedBy` should be defined and not empty
              assertions:
                defined: true
                nonEmpty: true
              weight: 5
  - name: Production readiness
    description: Ensuring services are ready for production deployment.
    entities:
      - field: type
        operator: eq
        value: service
    levels:
      - name: Bronze
        rules:
          # some rules...
      - name: Silver
        rules:
          # some rules...
      - name: Gold
        rules:
          # some rules...
```

## Applicable entities

Scorecard can be applied to any entity or group of catalog entities like services, domains, teams, users, API operations, data schemas, and custom ones.

Applicable entities are defined in the `entities` section and can be combined using logical operators.

### Operators

Entities filtering supports logical and comparison operators.

#### Logical operators

- `and` - All conditions must be true (uses `conditions` array)
- `or` - At least one condition must be true (uses `conditions` array)
- `not` - Negates a condition or group (uses `condition` singular)

Filters use an explicit `operator` field with either:

- `conditions` array for `and`/`or` operators
- `condition` singular for `not` operator

When using a plain array without an operator wrapper, conditions default to `AND` logic.

#### Comparison operators

Used in entity filters to select which entities a scorecard applies to:

**Basic comparisons:**

- `eq` - Equal to
- `in` - Value in array
- `gt`, `gte`, `lt`, `lte` - Numeric/date comparison (greater than, greater than or equal, less than, less than or equal)
- `contains`, `startsWith`, `endsWith` - String matching
- `exists` - Field presence check (value: `true` or `false`)
- `isEmpty` - Empty check (value: `true` or `false`)
- `between` - Range check (value: `[min, max]`)
- `matches` - Regex pattern matching (value: regex string)

**Array query operators:**

- `some` - At least one array item matches all conditions (uses `match` array with conditions)
- `every` - All array items match conditions (uses `match` array with conditions)
- `none` - No array items match conditions (uses `match` array with conditions)

#### Assertion operators

Used in scorecard rules to validate entity properties.
Based on [Redocly assertion object](https://redocly.com/docs/cli/rules/configurable-rules#assertion-object) with additional operators:

- `eq: value` - Equal to
- `gt: value` - Greater than
- `gte: value` - Greater than or equal
- `lt: value` - Less than
- `lte: value` - Less than or equal

### Examples

#### Simple AND entities filtering

Entities of API descriptions with OpenAPI specification:

```yaml
entities:
  - field: type
    operator: eq
    value: api-description
  - field: metadata.specType
    operator: eq
    value: openapi
```

Same as using explicit operator:

```yaml
entities:
  operator: and
  conditions:
    - field: type
      operator: eq
      value: api-description
    - field: metadata.specType
      operator: eq
      value: openapi
```

#### Simple OR entities filtering

Entities of domains or services:

```yaml
entities:
  operator: or
  conditions:
    - field: type
      operator: eq
      value: domain
    - field: type
      operator: eq
      value: service
```

#### Field presence and emptiness checks

Entities that have a description field defined:

```yaml
entities:
  field: description
  operator: exists
  value: true
```

Entities that have an owner relation Platform team:

```yaml
entities:
  field: relations
  operator: some
  match:
    - field: type
      operator: eq
      value: ownedBy
    - field: key
      operator: eq
      value: platform-team
```

or same as using sugar syntax:

```yaml
entities:
  field: relations.ownedBy # sugar syntax for relations.ownedBy.key
  operator: eq
  value: platform-team
```

Entities with empty tags array:

```yaml
entities:
  field: metadata.tags
  operator: isEmpty
  value: true
```

Services with non-empty on-call field:

```yaml
entities:
  operator: and
  conditions:
    - field: type
      operator: eq
      value: service
    - field: metadata.onCall
      operator: isEmpty
      value: false
```

#### Array queries

Entities that have an owner (any relation with type=ownedBy):

```yaml
entities:
  field: relations
  operator: some
  match:
    - field: type
      operator: eq
      value: ownedBy
```

Entities owned by specific team:

```yaml
entities:
  field: relations
  operator: some
  match:
    - field: type
      operator: eq
      value: ownedBy
    - field: key
      operator: eq
      value: platform-team
```

Entities without any owner:

```yaml
entities:
  field: relations
  operator: none
  match:
    - field: type
      operator: eq
      value: ownedBy
```

Services where all dependencies are internal:

```yaml
entities:
  operator: and
  conditions:
    - field: type
      operator: eq
      value: service
    - field: relations
      operator: every
      match:
        - field: type
          operator: eq
          value: dependsOn
        - field: metadata.external
          operator: eq
          value: false
```

Entities with at least one critical relation:

```yaml
entities:
  field: relations
  operator: some
  match:
    - field: metadata.criticality
      operator: eq
      value: high
```

#### Negation with NOT operator

Entities that are NOT services:

```yaml
entities:
  operator: not
  condition:
    field: type
    operator: eq
    value: service
```

Services that are NOT deprecated:

```yaml
entities:
  operator: and
  conditions:
    - field: type
      operator: eq
      value: service
    - operator: not
      condition:
        field: metadata.deprecated
        operator: eq
        value: true
```

Services that are NOT in draft or archived status:

```yaml
entities:
  operator: and
  conditions:
    - field: type
      operator: eq
      value: service
    - operator: not
      condition:
        field: status
        operator: in
        value: [draft, archived]
```

Services that are NOT (deprecated OR archived):

```yaml
entities:
  operator: and
  conditions:
    - field: type
      operator: eq
      value: service
    - operator: not
      condition:
        operator: or
        conditions:
          - field: status
            operator: eq
            value: deprecated
          - field: status
            operator: eq
            value: archived
```

#### Nested entities filtering: (X AND Y) OR (A AND B)

Entities of OpenAPI descriptions OR services owned by platform-team:

```yaml
entities:
  operator: or
  conditions:
    - operator: and
      conditions:
        - field: type
          operator: eq
          value: api-description
        - field: metadata.specType
          operator: eq
          value: openapi
    - operator: and
      conditions:
        - field: type
          operator: eq
          value: service
        - field: relations.ownedBy
          operator: eq
          value: platform-team
```

#### Nested entities filtering: (X OR Y) AND (A OR B)

Entities of (domains or services) AND (owned by platform-team or backend-team):

```yaml
entities:
  operator: and
  conditions:
    - operator: or
      conditions:
        - field: type
          operator: eq
          value: domain
        - field: type
          operator: eq
          value: service
    - operator: or
      conditions:
        - field: relations.ownedBy
          operator: eq
          value: platform-team
        - field: relations.ownedBy
          operator: eq
          value: backend-team
```

#### Complex nested entities filtering with mixed conditions

Entities of ((OpenAPI or AsyncAPI) AND active status) OR executive-owned OR (critical domains):

```yaml
entities:
  operator: or
  conditions:
    - operator: and
      conditions:
        - operator: or
          conditions:
            - field: metadata.specType
              operator: eq
              value: openapi
            - field: metadata.specType
              operator: eq
              value: asyncapi
        - field: metadata.status
          operator: eq
          value: active
    - field: relations
      operator: some
      match:
        - field: type
          operator: eq
          value: ownedBy
        - field: key
          operator: eq
          value: executive-team
    - operator: and
      conditions:
        - field: type
          operator: eq
          value: domain
        - field: metadata.critical
          operator: eq
          value: true
```

## Rules

Rules define validation criteria for entities using assertion operators (see [Operators](#operators) section).

Each rule is compatible with the current [Redocly rules schema](https://redocly.com/docs/cli/rules/configurable-rules).

### Entity rules

New Catalog node types are introduced to support Catalog entities:

- `Entity` - represents a Catalog entity
- `EntityMetadata` - represents a Metadata of a Catalog entity
- `EntityRelations` - represents a list of Relations of a Catalog entity
- `EntityRelation` - represents a Relation of a Catalog entity

#### Basic entity rule

```yaml
rule/has_title:
  title: Entity has title
  subject:
    type: Entity
    property: title
  severity: error
  message: Entity must have a title
  assertions:
    defined: true
    nonEmpty: true
  weight: 2
```

#### Rule with multiple assertions

```yaml
rule/low_incident_count:
  title: Service has low incident count
  subject:
    type: EntityMetadata
    property: openedIncidents
  severity: warning
  message: Service has too many open incidents
  assertions:
    defined: true
    lt: 10
  weight: 2
```

#### Rule checking relations

```yaml
rule/has_owner_team:
  title: Entity is owned by a team
  subject:
    type: EntityRelation
    property: ownedBy
  severity: error
  message: Entity must be owned by a team
  assertions:
    defined: true
    nonEmpty: true
  weight: 5
```

#### Conditional rule with `where`

```yaml
rule/production_has_on_call:
  title: Production services must have on-call
  subject:
    type: EntityMetadata
    property: onCall
  severity: error
  message: Production services must have on-call rotation
  assertions:
    defined: true
    nonEmpty: true
  where:  # Only apply to production services
    - subject:
        type: EntityMetadata
        property: environment
      assertions:
        const: production
  weight: 4
```

### OpenAPI/AsyncAPI rules

For backward compatibility, you can still use OpenAPI/AsyncAPI-specific rules from rulesets:

```yaml
rules:
  no-ambiguous-paths: error
  no-invalid-schema-examples: error
  spec-strict-refs:
    severity: error
    weight: 4
```

These rules only apply to entities with `type: apiDescription` and `metadata.specType` of `openapi` or `asyncapi`.

**Note:** If your scorecard filter doesn't select only API description entities, OpenAPI/AsyncAPI-specific rules will be ignored automatically.

**Note:** By default, if not specified, rule weight is `1`.

## Levels

Levels are defined in the `levels` section of each scorecard.
Each level is defined with a `name`, `rules` and optionally `extends` a ruleset file.

```yaml
levels:
  - name: Bronze
    extends: # backwards compatibility with the old scorecard configuration of rulesets, for OpenAPI/AsyncAPI descriptions only
      - minimal
  - name: Silver
    rules:
      no-ambiguous-paths: error # backwards compatibility with the old scorecard configuration of defined rules, for OpenAPI/AsyncAPI descriptions only
      no-invalid-schema-examples: error # by default weight is 1
      spec-strict-refs:
        severity: error
        weight: 4
      paths-kebab-case:
        severity: error
        weight: 2
  - name: Gold
    rules:
      no-ambiguous-paths: error
      no-invalid-schema-examples: error
      rule/has_title:
        title: Entity has title
        subject:
          type: Entity
          property: title
        severity: error
        message: Entity must have a title
        assertions:
          defined: true
          nonEmpty: true
        weight: 2
```
