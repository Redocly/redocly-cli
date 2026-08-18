# Whether the flow an agent produces would actually run

The [first benchmark](./tree-agent-index-benchmark.md) asked an agent to name the calls a task needs, and measured what that cost.
This one asks for a working flow — the order of calls, what each one needs, what carries over — and then checks the answer against the description.
That check is the point: a run that skips the token call is cheap and useless, and the first benchmark could not tell it apart from a good one.

Three descriptions, four models, two conditions, three runs each — 72 runs:

- **no tree** — the task and the path to the file. Neither `tree` nor Redocly is named.
- **tree** — the same task plus one line: the CLI is installed, and `tree --format=ai <flags>` makes searching the description easier. No flags are listed and no documentation is linked.

Each run is measured by the context it added to its own session, with tool calls after the slash, by what it was billed, and by whether its flow passes the check.
How all four are counted is in [How this was measured](#how-this-was-measured) at the end.

Every context and cost cell is the median of the runs in it whose flow works.
A cell marked ❌ is one where none of the three did: its numbers are the median of all three and say what an answer that does not work cost, not what the task costs.
The difference column always divides one side by the other, so where a ❌ meets an unmarked cell it measures the gap between a broken answer and a working one, not a saving.

Descriptions: GitHub REST (`api.github.com.yaml` from [`github/rest-api-description`](https://github.com/github/rest-api-description), 10.0 MB),
a billing API (Rebilly, 1.3 MB), the Cafe demo API (41 KB).

## The head-to-heads

{% tabs %}
{% tab label="GitHub REST · 10.0 MB" %}

**Task:** a CI job that publishes a release, attaches the built zip, and can take that file back down, authenticating as a GitHub App installation.
Expected: `POST /app/installations/{id}/access_tokens` → `POST /releases` → the asset upload → `DELETE /releases/assets/{asset_id}`.
Traps: the upload overrides its server to `https://uploads.github.com`, and the delete is keyed by asset, not release.

{% tabs %}
{% tab label="Prompt: no tree" %}

```text
I want a CI job that publishes a release for a repository, attaches the built zip to it,
and can take that file back down if the upload turns out wrong. Work out what it calls.
The CI authenticates as a GitHub App installation.

API description: github-api.yaml

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% tab label="Prompt: tree" %}

```text
I want a CI job that publishes a release for a repository, attaches the built zip to it,
and can take that file back down if the upload turns out wrong. Work out what it calls.
The CI authenticates as a GitHub App installation.

API description: github-api.yaml

The Redocly CLI is installed. Searching the description is easier with `tree --format=ai <flags>`:
redocly tree github-api.yaml --format=ai <flags>

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% /tabs %}

Context the run added, and the tool calls it took:

| Model     |       no tree |       tree | Difference |
| --------- | ------------: | ---------: | ---------: |
| Sonnet 5  |   12,528 / 14 | 12,915 / 7 |        +3% |
| Opus 5    |   16,462 / 13 | 16,284 / 9 |        −1% |
| Fable 5   |   14,815 / 10 | 11,088 / 9 |       −25% |
| Haiku 4.5 | 15,505 / 8 ❌ |  8,565 / 6 |       −45% |

What those runs were billed:

| Model     |  no tree |  tree | Difference |
| --------- | -------: | ----: | ---------: |
| Sonnet 5  |    $0.39 | $0.30 |       −23% |
| Opus 5    |    $0.72 | $0.61 |       −15% |
| Fable 5   |    $1.00 | $0.80 |       −20% |
| Haiku 4.5 | $0.10 ❌ | $0.08 |       −20% |

Whether each run produced a flow that would run:

| Run               | no tree      | tree         |
| ----------------- | ------------ | ------------ |
| Sonnet 5 · run 1  | works        | works        |
| Sonnet 5 · run 2  | works        | works        |
| Sonnet 5 · run 3  | works        | works        |
| Opus 5 · run 1    | works        | works        |
| Opus 5 · run 2    | works        | works        |
| Opus 5 · run 3    | works        | works        |
| Fable 5 · run 1   | works        | works        |
| Fable 5 · run 2   | works        | works        |
| Fable 5 · run 3   | works        | works        |
| Haiku 4.5 · run 1 | no app token | no app token |
| Haiku 4.5 · run 2 | no app token | no app token |
| Haiku 4.5 · run 3 | no app token | works        |

A run works when its flow contains `POST /app/installations/{id}/access_tokens`, `POST /releases`, the asset upload and `DELETE /releases/assets/{asset_id}`, and sends the upload to `uploads.github.com`.
The upload may be addressed either by path or through the `upload_url` the release returns; both count.

What the tree agent ran:

{% tabs %}
{% tab label="Sonnet 5" %}

{% tabs %}
{% tab label="Run 1" %}

```bash
redocly tree github-api.yaml --format=ai --search "release"
redocly tree github-api.yaml --format=ai --find "release"
redocly tree github-api.yaml --format=ai --find "upload asset"
redocly tree github-api.yaml --format=ai --path "/repos/{owner}/{repo}/releases" --operation post --with-deps
redocly tree github-api.yaml --format=ai --path "/repos/{owner}/{repo}/releases/{release_id}/assets" --operation post --with-deps
redocly tree github-api.yaml --format=ai --path "/repos/{owner}/{repo}/releases/assets/{asset_id}" --operation delete --with-deps
redocly tree github-api.yaml --format=ai --find "installation access token"
redocly tree github-api.yaml --format=ai --path "/app/installations/{installation_id}/access_tokens" --operation post --with-deps
```

{% /tab %}
{% tab label="Run 2" %}

```bash
redocly tree github-api.yaml --format=ai --search "release"
redocly tree github-api.yaml --format=ai --find "release"
redocly tree github-api.yaml --format=ai --find "upload release asset"
redocly tree github-api.yaml --format=ai --path "/repos/{owner}/{repo}/releases" --operation post --with-deps
redocly tree github-api.yaml --format=ai --path "/repos/{owner}/{repo}/releases/{release_id}/assets" --operation post --with-deps
redocly tree github-api.yaml --format=ai --path "/repos/{owner}/{repo}/releases/assets/{asset_id}" --operation delete --with-deps
redocly tree github-api.yaml --format=ai --find "create an installation access token"
redocly tree github-api.yaml --format=ai --path "/app/installations/{installation_id}/access_tokens" --operation post --with-deps
```

{% /tab %}
{% tab label="Run 3" %}

```bash
redocly tree github-api.yaml --format=ai --search "app"
redocly tree github-api.yaml --format=ai --find "release"
redocly tree github-api.yaml --format=ai --find "upload release asset"
redocly tree github-api.yaml --format=ai --find "installation access token"
redocly tree github-api.yaml --format=ai --path "/app/installations/{installation_id}/access_tokens" --operation post --with-deps
redocly tree github-api.yaml --format=ai --path "/repos/{owner}/{repo}/releases" --operation post
redocly tree github-api.yaml --format=ai --path "/repos/{owner}/{repo}/releases/{release_id}/assets" --operation post
redocly tree github-api.yaml --format=ai --path "/repos/{owner}/{repo}/releases/assets/{asset_id}" --operation delete
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% tab label="Opus 5" %}

{% tabs %}
{% tab label="Run 1" %}

```bash
redocly tree github-api.yaml --format=ai --help
redocly tree github-api.yaml --format=ai --find "release"
redocly tree github-api.yaml --format=ai --find "upload release asset"
redocly tree github-api.yaml --format=ai --operation=apps/create-installation-access-token
redocly tree github-api.yaml --format=ai --operation=repos/create-release
redocly tree github-api.yaml --format=ai --operation=repos/upload-release-asset
redocly tree github-api.yaml --format=ai --operation=repos/delete-release-asset
redocly tree github-api.yaml --format=ai --find "repository installation app"
redocly tree github-api.yaml --format=ai --component=schemas --name=app-permissions
redocly tree github-api.yaml --format=ai --operation=repos/check-immutable-releases
```

{% /tab %}
{% tab label="Run 2" %}

```bash
redocly tree github-api.yaml --format=ai --grep "releases"
redocly tree github-api.yaml --format=ai --find "release"
redocly tree github-api.yaml --format=ai --find "upload release asset"
redocly tree github-api.yaml --format=ai --operation repos/create-release --with-deps
redocly tree github-api.yaml --format=ai --path "/repos/{owner}/{repo}/releases/{release_id}/assets" --operation post --with-deps
redocly tree github-api.yaml --format=ai --operation repos/delete-release-asset --with-deps
redocly tree github-api.yaml --format=ai --operation repos/check-immutable-releases --with-deps
redocly tree github-api.yaml --format=ai --find "installation access token"
redocly tree github-api.yaml --format=ai --operation apps/create-installation-access-token --with-deps
redocly tree github-api.yaml --format=ai --operation repos/update-release
redocly tree github-api.yaml --format=ai --component schemas --name check-immutable-releases --with-deps
redocly tree github-api.yaml --format=ai --component schemas --name release
redocly tree github-api.yaml --format=ai --component schemas --name release-asset
redocly tree github-api.yaml --format=ai --operation repos/enable-immutable-releases
redocly tree github-api.yaml --format=ai --path "/repos/{owner}/{repo}/releases/{release_id}/assets"
```

{% /tab %}
{% tab label="Run 3" %}

```bash
redocly tree github-api.yaml --format=ai
redocly tree github-api.yaml --format=ai --find="release asset"
redocly tree github-api.yaml --format=ai --path="/repos/{owner}/{repo}/releases" --operation=post
redocly tree github-api.yaml --format=ai --path="/repos/{owner}/{repo}/releases/{release_id}/assets" --operation=post
redocly tree github-api.yaml --format=ai --path="/repos/{owner}/{repo}/releases/assets/{asset_id}" --operation=delete
redocly tree github-api.yaml --format=ai --find="installation access token"
redocly tree github-api.yaml --format=ai --path="/app/installations/{installation_id}/access_tokens" --operation=post
redocly tree github-api.yaml --format=ai --component=schemas --name=installation-token
redocly tree github-api.yaml --format=ai --component=schemas --name=release
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% tab label="Fable 5" %}

{% tabs %}
{% tab label="Run 1" %}

```bash
redocly tree github-api.yaml --format=ai --search releases
redocly tree github-api.yaml --format=ai --search "access_tokens"
redocly tree github-api.yaml --format=ai --find "release"
redocly tree github-api.yaml --format=ai --find "installation access token"
redocly tree github-api.yaml --format=ai --find "upload asset"
redocly tree github-api.yaml --format=ai --operation apps/create-installation-access-token
redocly tree github-api.yaml --format=ai --operation repos/create-release
redocly tree github-api.yaml --format=ai --operation repos/upload-release-asset
redocly tree github-api.yaml --format=ai --operation repos/delete-release-asset
redocly tree github-api.yaml --format=ai --path "/repos/{owner}/{repo}/installation"
```

{% /tab %}
{% tab label="Run 2" %}

```bash
redocly tree github-api.yaml --format=ai --help
redocly tree github-api.yaml --format=ai --find "installation access token"
redocly tree github-api.yaml --format=ai --find "release"
redocly tree github-api.yaml --format=ai --find "upload release asset"
redocly tree github-api.yaml --format=ai --operation apps/create-installation-access-token
redocly tree github-api.yaml --format=ai --operation repos/create-release
redocly tree github-api.yaml --format=ai --operation repos/upload-release-asset
redocly tree github-api.yaml --format=ai --operation repos/delete-release-asset
redocly tree github-api.yaml --format=ai --find "repository installation"
```

{% /tab %}
{% tab label="Run 3" %}

```bash
redocly tree github-api.yaml --format=ai --search "release"
redocly tree github-api.yaml --format=ai --find "release"
redocly tree github-api.yaml --format=ai --find "installation token"
redocly tree github-api.yaml --format=ai --find "upload asset"
redocly tree github-api.yaml --format=ai --operation apps/create-installation-access-token
redocly tree github-api.yaml --format=ai --operation repos/upload-release-asset
redocly tree github-api.yaml --format=ai --operation apps/get-repo-installation
redocly tree github-api.yaml --format=ai --operation repos/create-release
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% tab label="Haiku 4.5" %}

{% tabs %}
{% tab label="Run 1" %}

```bash
redocly tree github-api.yaml --format=ai --grep "release" 2>/dev/null
redocly tree github-api.yaml --format=ai --grep "asset" 2>/dev/null
```

{% /tab %}
{% tab label="Run 2" %}

```bash
redocly tree github-api.yaml --format=ai
redocly tree github-api.yaml --format=ai --find=release
redocly tree github-api.yaml --format=ai --find=upload asset
redocly tree github-api.yaml --format=ai --find=asset
redocly tree github-api.yaml --format=ai --path=/repos/\{owner\}/\{repo\}/releases --operation=post --with-deps
redocly tree github-api.yaml --format=ai --path=/repos/\{owner\}/\{repo\}/releases/\{release_id\}/assets --operation=post --with-deps
redocly tree github-api.yaml --format=ai --path=/repos/\{owner\}/\{repo\}/releases/assets/\{asset_id\} --operation=delete --with-deps
```

{% /tab %}
{% tab label="Run 3" %}

```bash
redocly tree github-api.yaml --format=ai --filter="release"
redocly tree github-api.yaml --format=ai --find="release"
redocly tree github-api.yaml --format=ai --operation="post" --path="/repos/{owner}/{repo}/releases" --with-deps
redocly tree github-api.yaml --format=ai --find="upload asset"
redocly tree github-api.yaml --format=ai --operation="post" --path="/repos/{owner}/{repo}/releases/{release_id}/assets" --with-deps
redocly tree github-api.yaml --format=ai --operation="delete" --path="/repos/{owner}/{repo}/releases/assets/{asset_id}" --with-deps
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% /tabs %}

Sonnet 5, Opus 5 and Fable 5 pass every run on both sides, so here the index buys tool calls and price rather than correctness: 7 calls against 14 for Sonnet 5, 9 against 10 for Fable 5.
Haiku 4.5 fails the same way each time — it declares an installation token in the flow and never calls the endpoint that mints one — and gets there once with the index, never without.

{% /tab %}
{% tab label="Billing API · 1.3 MB" %}

**Task:** put an existing customer onto a recurring plan, with nothing else set up yet.
Expected: `POST /products` → `POST /plans` → `POST /subscriptions`.
Traps: the subscription body requires `orderType`, `customerId`, `websiteId` and `items`, and every call needs the `SecretApiKey` header.

{% tabs %}
{% tab label="Prompt: no tree" %}

```text
We're moving existing customers onto monthly recurring billing. One of them is already in
the system, nothing else is set up yet. Work out what our backend has to call to get that
customer onto a recurring plan.

API description: rebilly.yaml

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% tab label="Prompt: tree" %}

```text
We're moving existing customers onto monthly recurring billing. One of them is already in
the system, nothing else is set up yet. Work out what our backend has to call to get that
customer onto a recurring plan.

API description: rebilly.yaml

The Redocly CLI is installed. Searching the description is easier with `tree --format=ai <flags>`:
redocly tree rebilly.yaml --format=ai <flags>

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% /tabs %}

Context the run added, and the tool calls it took:

| Model     |        no tree |           tree | Difference |
| --------- | -------------: | -------------: | ---------: |
| Sonnet 5  | 31,179 / 32 ❌ | 25,231 / 11 ❌ |       −19% |
| Opus 5    |    35,212 / 32 |    32,019 / 21 |        −9% |
| Fable 5   |    32,043 / 30 |    18,329 / 11 |       −43% |
| Haiku 4.5 | 19,459 / 16 ❌ | 17,174 / 14 ❌ |       −12% |

What those runs were billed:

| Model     |  no tree |     tree | Difference |
| --------- | -------: | -------: | ---------: |
| Sonnet 5  | $1.05 ❌ | $0.49 ❌ |       −53% |
| Opus 5    |    $1.56 |    $1.00 |       −36% |
| Fable 5   |    $2.82 |    $1.32 |       −53% |
| Haiku 4.5 | $0.16 ❌ | $0.14 ❌ |       −12% |

Whether each run produced a flow that would run:

| Run               | no tree                                       | tree                               |
| ----------------- | --------------------------------------------- | ---------------------------------- |
| Sonnet 5 · run 1  | no auth scheme                                | no product call, no auth scheme    |
| Sonnet 5 · run 2  | no auth scheme                                | wrong auth header                  |
| Sonnet 5 · run 3  | no auth scheme                                | no auth scheme                     |
| Opus 5 · run 1    | works                                         | works                              |
| Opus 5 · run 2    | works                                         | works                              |
| Opus 5 · run 3    | works                                         | works                              |
| Fable 5 · run 1   | works                                         | works                              |
| Fable 5 · run 2   | works                                         | works                              |
| Fable 5 · run 3   | works                                         | works                              |
| Haiku 4.5 · run 1 | no product call, no plan call, no auth scheme | no product call, wrong auth header |
| Haiku 4.5 · run 2 | no product call, no plan call, no auth scheme | no product call, no auth scheme    |
| Haiku 4.5 · run 3 | no auth scheme                                | no product call, no auth scheme    |

A run works when its flow contains `POST /products`, `POST /plans` and `POST /subscriptions`, names the four fields the subscription body requires — `orderType`, `customerId`, `websiteId`, `items` — and sends the secret key in the `REB-APIKEY` header the description declares.
Naming the `SecretApiKey` scheme and then putting the key in `Authorization` counts as a failure, because Rebilly answers those calls with 401.

What the tree agent ran:

{% tabs %}
{% tab label="Sonnet 5" %}

{% tabs %}
{% tab label="Run 1" %}

```bash
redocly tree rebilly.yaml --format=ai --filter="*subscription*"
redocly tree rebilly.yaml --format=ai --find="subscription"
redocly tree rebilly.yaml --format=ai --path=/subscriptions --operation=post --with-deps
redocly tree rebilly.yaml --format=ai --component=schemas --name=Subscription
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem
redocly tree rebilly.yaml --format=ai --component=schemas --name=OriginalPlan
redocly tree rebilly.yaml --format=ai --find="payment-instruments"
redocly tree rebilly.yaml --format=ai --path=/payment-instruments --operation=post --with-deps
redocly tree rebilly.yaml --format=ai --component=schemas --name=PaymentCardCreatePlain
redocly tree rebilly.yaml --format=ai --component=schemas --name=ContactObject
redocly tree rebilly.yaml --format=ai --component=schemas --name=CustomerId
```

{% /tab %}
{% tab label="Run 2" %}

```bash
redocly tree rebilly.yaml --format=ai --paths-matching '*subscription*'
redocly tree rebilly.yaml --format=ai --find subscription
redocly tree rebilly.yaml --format=ai --path /subscriptions --operation post --with-deps
redocly tree rebilly.yaml --format=ai --component schemas --name SubscriptionOrOneTimeSaleItem
redocly tree rebilly.yaml --format=ai --component schemas --name OriginalPlan
redocly tree rebilly.yaml --format=ai --component schemas --name FlexiblePlan
redocly tree rebilly.yaml --format=ai --find "plans"
redocly tree rebilly.yaml --format=ai --path /plans --operation post --with-deps
redocly tree rebilly.yaml --format=ai --component schemas --name Product
redocly tree rebilly.yaml --format=ai --find "recurringInterval"
redocly tree rebilly.yaml --format=ai --component schemas --name PlanPriceFormula
redocly tree rebilly.yaml --format=ai --component schemas --name SubscriptionPlan
redocly tree rebilly.yaml --format=ai --component schemas --name Subscription
redocly tree rebilly.yaml --format=ai --component schemas --name PlanFormulaFlatRate
redocly tree rebilly.yaml --format=ai --find "payment-instrument"
redocly tree rebilly.yaml --format=ai --path /payment-instruments --operation post --with-deps
redocly tree rebilly.yaml --format=ai --component securitySchemes
redocly tree rebilly.yaml --format=ai
redocly tree rebilly.yaml --format=ai --path /products --operation post --with-deps
```

{% /tab %}
{% tab label="Run 3" %}

```bash
redocly tree rebilly.yaml --format=ai --depth 2
redocly tree rebilly.yaml --format=ai --find "subscription"
redocly tree rebilly.yaml --format=ai --path /subscriptions/{id} --operation put --with-deps
redocly tree rebilly.yaml --format=ai --component schemas --name SubscriptionOrOneTimeSaleItem --with-deps
redocly tree rebilly.yaml --format=ai --find "plan"
redocly tree rebilly.yaml --format=ai --find "product"
redocly tree rebilly.yaml --format=ai --path /plans --operation post --with-deps
redocly tree rebilly.yaml --format=ai --component schemas --name Product --with-deps
redocly tree rebilly.yaml --format=ai --path /products --operation post
redocly tree rebilly.yaml --format=ai --component schemas --name PlanPriceFormula --with-deps
redocly tree rebilly.yaml --format=ai --component schemas --name SubscriptionPlan
redocly tree rebilly.yaml --format=ai --path /subscriptions --operation post --with-deps
redocly tree rebilly.yaml --format=ai --find "payment-instrument"
redocly tree rebilly.yaml --format=ai --component schemas --name WebsiteId
redocly tree rebilly.yaml --format=ai --component schemas --name CustomerId
redocly tree rebilly.yaml --format=ai --path /payment-instruments --operation post --with-deps
redocly tree rebilly.yaml --format=ai --component schemas --name PlanFormulaFixedFee
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% tab label="Opus 5" %}

{% tabs %}
{% tab label="Run 1" %}

```bash
redocly tree rebilly.yaml --format=ai
redocly tree rebilly.yaml --format=ai --tag=Products
redocly tree rebilly.yaml --format=ai --tag=Plans
redocly tree rebilly.yaml --format=ai --tag=Orders
redocly tree rebilly.yaml --format=ai --path=/products --operation=post --with-deps
redocly tree rebilly.yaml --format=ai --path=/plans --operation=post --with-deps
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionPlan
redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanPriceFormula --with-deps
redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanFormulaFlatRate
redocly tree rebilly.yaml --format=ai --path=/subscriptions --operation=post --with-deps
redocly tree rebilly.yaml --format=ai --component=schemas --name=WebsiteId
redocly tree rebilly.yaml --format=ai --tag="Payment instruments"
redocly tree rebilly.yaml --format=ai --tag="Payment tokens"
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem
redocly tree rebilly.yaml --format=ai --component=schemas --name=OriginalPlan
redocly tree rebilly.yaml --format=ai --component=schemas --name=FlexiblePlan
redocly tree rebilly.yaml --format=ai --find=website
redocly tree rebilly.yaml --format=ai --path=/payment-instruments --operation=post --with-deps
redocly tree rebilly.yaml --format=ai --pointer='#/components/requestBodies/PostPaymentInstrument'
redocly tree rebilly.yaml --format=ai --path=/tokens --operation=post --with-deps
redocly tree rebilly.yaml --format=ai --component=schemas --name=PaymentCardToken
redocly tree rebilly.yaml --format=ai --tag=Customers
redocly tree rebilly.yaml --format=ai --component=schemas --name=Customer
redocly tree rebilly.yaml --format=ai --find="gateway account"
redocly tree rebilly.yaml --format=ai --tag=Invoices
redocly tree rebilly.yaml --format=ai --component=securitySchemes --name=SecretApiKey
redocly tree rebilly.yaml --format=ai --component=parameters --name=subscriptionExpand
redocly tree rebilly.yaml --format=ai --component=schemas --name=ContactObject
```

{% /tab %}
{% tab label="Run 2" %}

```bash
redocly tree rebilly.yaml --format=ai
redocly tree --help
redocly tree rebilly.yaml --format=ai --tag=Plans
redocly tree rebilly.yaml --format=ai --tag="Payment instruments"
redocly tree rebilly.yaml --format=ai --operation=PostProduct --with-deps
redocly tree rebilly.yaml --format=ai --operation=PostPlan --with-deps
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionPlan --with-deps
redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanPriceFormula --with-deps
redocly tree rebilly.yaml --format=ai --operation=PostSubscription --with-deps
redocly tree rebilly.yaml --format=ai --operation=PostToken --with-deps
redocly tree rebilly.yaml --format=ai --component=requestBodies --name=Subscription
redocly tree rebilly.yaml --format=ai --find=website
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem --with-deps
redocly tree rebilly.yaml --format=ai --operation=PostPaymentInstrument --with-deps
redocly tree rebilly.yaml --format=ai --component=securitySchemes
```

{% /tab %}
{% tab label="Run 3" %}

```bash
redocly tree --help
redocly tree rebilly.yaml --format=ai --tag=Plans
redocly tree rebilly.yaml --format=ai --tag="Payment tokens"
redocly tree rebilly.yaml --format=ai --tag=Products; redocly tree rebilly.yaml --format=ai --tag=Orders
redocly tree rebilly.yaml --format=ai --tag="Payment instruments"; redocly tree rebilly.yaml --format=ai --find="website"
redocly tree rebilly.yaml --format=ai --operation=PostProduct --with-deps
redocly tree rebilly.yaml --format=ai --operation=PostPlan --with-deps
redocly tree rebilly.yaml --format=ai --operation=PostSubscription --with-deps
redocly tree rebilly.yaml --format=ai --operation=PostPaymentInstrument --with-deps
redocly tree rebilly.yaml --format=ai --tag=Customers; echo '--- token'; redocly tree rebilly.yaml --format=ai --operation=PostToken --with-deps
redocly tree rebilly.yaml --format=ai --component=securitySchemes
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% tab label="Fable 5" %}

{% tabs %}
{% tab label="Run 1" %}

```bash
redocly tree rebilly.yaml --format=ai
redocly tree rebilly.yaml --format=ai --tag=Plans; redocly tree rebilly.yaml --format=ai --tag=Orders
redocly tree rebilly.yaml --format=ai --path=/plans --operation=post --with-deps
redocly tree rebilly.yaml --format=ai --tag=Products; redocly tree rebilly.yaml --format=ai --component=schemas --name=Product
redocly tree rebilly.yaml --format=ai --path=/subscriptions --operation=post --with-deps
redocly tree rebilly.yaml --format=ai --find=website
redocly tree rebilly.yaml --format=ai --component=schemas --name=OriginalPlan; redocly tree rebilly.yaml --format=ai --component=schemas --name=WebsiteId
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionPlan
redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanPriceFormula
redocly tree rebilly.yaml --format=ai --tag=Customers
redocly tree rebilly.yaml --format=ai --component=securitySchemes
```

{% /tab %}
{% tab label="Run 2" %}

```bash
redocly tree rebilly.yaml --format=ai
redocly tree rebilly.yaml --format=ai --tag=Plans; redocly tree rebilly.yaml --format=ai --tag=Orders
redocly tree rebilly.yaml --format=ai --path=/plans --operation=post --with-deps
redocly tree rebilly.yaml --format=ai --tag=Products; redocly tree rebilly.yaml --format=ai --component=schemas --name=Product
redocly tree rebilly.yaml --format=ai --path=/subscriptions --operation=post --with-deps
redocly tree rebilly.yaml --format=ai --find=website
redocly tree rebilly.yaml --format=ai --component=schemas --name=Customer
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionPlan
redocly tree rebilly.yaml --format=ai --tag=Customers
redocly tree rebilly.yaml --format=ai --component=securitySchemes
redocly tree rebilly.yaml --format=ai --component=securitySchemes --name=SecretApiKey
```

{% /tab %}
{% tab label="Run 3" %}

```bash
redocly tree rebilly.yaml --format=ai
redocly tree rebilly.yaml --format=ai --tag=Plans; redocly tree rebilly.yaml --format=ai --tag=Orders
redocly tree rebilly.yaml --format=ai --path=/products --operation=post --with-deps
redocly tree rebilly.yaml --format=ai --path=/plans --operation=post --with-deps
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionPlan
redocly tree rebilly.yaml --format=ai --path=/subscriptions --operation=post --with-deps
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem
redocly tree rebilly.yaml --format=ai --component=schemas --name=OriginalPlan
redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanPriceFormula
redocly tree rebilly.yaml --format=ai --component=securitySchemes
redocly tree rebilly.yaml --format=ai --component=securitySchemes --name=SecretApiKey
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% tab label="Haiku 4.5" %}

{% tabs %}
{% tab label="Run 1" %}

```bash
redocly tree rebilly.yaml --format=ai
redocly tree rebilly.yaml --format=ai --find="subscription"
redocly tree rebilly.yaml --format=ai --path=/subscriptions --operation=post --with-deps
redocly tree rebilly.yaml --format=ai --component=requestBodies --name=Subscription
redocly tree rebilly.yaml --format=ai --component=schemas --name=Subscription
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem
redocly tree rebilly.yaml --format=ai --component=schemas --name=OriginalPlan
redocly tree rebilly.yaml --format=ai --find="plans" --tag="Plans"
redocly tree rebilly.yaml --format=ai --tag=Plans
redocly tree rebilly.yaml --format=ai --path=/plans --operation=post --with-deps
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionPlan
redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanPriceFormula
redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanFormulaFixedFee
```

{% /tab %}
{% tab label="Run 2" %}

```bash
redocly tree rebilly.yaml --format=ai
redocly tree rebilly.yaml --format=ai --find="subscription|recurring|plan"
redocly tree rebilly.yaml --format=ai --tag="Orders"
redocly tree rebilly.yaml --format=ai --tag="Plans"
redocly tree rebilly.yaml --format=ai --path="/subscriptions" --operation="post" --with-deps
redocly tree rebilly.yaml --format=ai --component="requestBodies" --name="Subscription"
redocly tree rebilly.yaml --format=ai --component="schemas" --name="Subscription"
redocly tree rebilly.yaml --format=ai --component="schemas" --name="SubscriptionOrOneTimeSaleItem"
redocly tree rebilly.yaml --format=ai --component="schemas" --name="OriginalPlan"
redocly tree rebilly.yaml --format=ai --tag="Payment instruments"
redocly tree rebilly.yaml --format=ai --tag="Customers"
redocly tree rebilly.yaml --format=ai --path="/plans" --operation="post" --with-deps
redocly tree rebilly.yaml --format=ai --component="schemas" --name="SubscriptionPlan"
redocly tree rebilly.yaml --format=ai --component="schemas" --name="PlanPriceFormula"
redocly tree rebilly.yaml --format=ai --component="schemas" --name="PlanFormulaFixedFee"
redocly tree rebilly.yaml --format=ai --path="/plans" --operation="get" --with-deps
redocly tree rebilly.yaml --format=ai --path="/customers/{id}" --operation="get"
redocly tree rebilly.yaml --format=ai --find="website"
```

{% /tab %}
{% tab label="Run 3" %}

```bash
redocly tree specs/rebilly.yaml --format=ai
redocly tree specs/rebilly.yaml --format=ai --find=subscription
redocly tree specs/rebilly.yaml --format=ai --path=/subscriptions --operation=post --with-deps
redocly tree specs/rebilly.yaml --format=ai --component=schemas --name=Subscription
redocly tree specs/rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem
redocly tree specs/rebilly.yaml --format=ai --component=schemas --name=OriginalPlan
redocly tree specs/rebilly.yaml --format=ai --find=plan --tag=Plans
redocly tree specs/rebilly.yaml --format=ai --tag=Plans
redocly tree specs/rebilly.yaml --format=ai --tag=Customers
redocly tree specs/rebilly.yaml --format=ai --find="payment instrument"
redocly tree specs/rebilly.yaml --format=ai --find=website
redocly tree specs/rebilly.yaml --format=ai --find="payment token"
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% /tabs %}

Opus 5 and Fable 5 pass every run on both sides, and the index cuts their work roughly in half: 21 calls against 32, 11 against 30.
Sonnet 5 and Haiku 4.5 never pass, and almost always for one reason: the sequence of calls is right and the request is unauthenticated.
Nine of those runs never mention the key at all; two name it and send it as `Authorization`, which this API rejects.

{% /tab %}
{% tab label="Cafe API · 41 KB" %}

**Task:** a mobile app that browses the menu, orders a coffee, and follows that order until it is ready.
Expected: `POST /oauth2/token` → `GET /menu` → `POST /orders` → `GET /orders/{orderId}`.
Trap: ordering and checking status need OAuth2 scopes, so a flow without the token call returns 401 twice.

{% tabs %}
{% tab label="Prompt: no tree" %}

```text
I'm building a mobile app for a cafe: the customer browses the menu, orders a coffee,
and follows that order until it's ready. Work out what the app has to call, end to end.

API description: cafe.yaml

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% tab label="Prompt: tree" %}

```text
I'm building a mobile app for a cafe: the customer browses the menu, orders a coffee,
and follows that order until it's ready. Work out what the app has to call, end to end.

API description: cafe.yaml

The Redocly CLI is installed. Searching the description is easier with `tree --format=ai <flags>`:
redocly tree cafe.yaml --format=ai <flags>

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% /tabs %}

Context the run added, and the tool calls it took:

| Model     |    no tree |        tree | Difference |
| --------- | ---------: | ----------: | ---------: |
| Sonnet 5  | 18,287 / 2 |   8,474 / 5 |       −54% |
| Opus 5    | 16,769 / 1 | 17,103 / 11 |        +2% |
| Fable 5   | 16,882 / 1 |   9,889 / 9 |       −41% |
| Haiku 4.5 | 15,008 / 1 |   7,604 / 8 |       −49% |

What those runs were billed:

| Model     | no tree |  tree | Difference |
| --------- | ------: | ----: | ---------: |
| Sonnet 5  |   $0.27 | $0.26 |        −4% |
| Opus 5    |   $0.41 | $0.58 |       +41% |
| Fable 5   |   $0.72 | $0.82 |       +14% |
| Haiku 4.5 |   $0.07 | $0.09 |       +29% |

Whether each run produced a flow that would run:

| Run               | no tree       | tree          |
| ----------------- | ------------- | ------------- |
| Sonnet 5 · run 1  | works         | works         |
| Sonnet 5 · run 2  | works         | works         |
| Sonnet 5 · run 3  | works         | works         |
| Opus 5 · run 1    | works         | works         |
| Opus 5 · run 2    | works         | works         |
| Opus 5 · run 3    | works         | works         |
| Fable 5 · run 1   | works         | works         |
| Fable 5 · run 2   | works         | works         |
| Fable 5 · run 3   | works         | works         |
| Haiku 4.5 · run 1 | no token call | no token call |
| Haiku 4.5 · run 2 | no token call | works         |
| Haiku 4.5 · run 3 | works         | no token call |

A run works when its flow contains `POST /oauth2/token`, `GET /menu`, `POST /orders` and `GET /orders/{orderId}`, all against `api.cafe.redocly.com`.

What the tree agent ran:

{% tabs %}
{% tab label="Sonnet 5" %}

{% tabs %}
{% tab label="Run 1" %}

```bash
redocly tree cafe.yaml --format=ai
redocly tree cafe.yaml --format=ai --path=/menu --operation=get --with-deps
redocly tree cafe.yaml --format=ai --path=/orders --operation=post --with-deps
redocly tree cafe.yaml --format=ai --path=/orders/{orderId} --operation=get --with-deps
redocly tree cafe.yaml --format=ai --path=/oauth2/register --operation=post --with-deps
redocly tree cafe.yaml --format=ai --component=securitySchemes
redocly tree cafe.yaml --format=ai --component=schemas --name=Beverage
redocly tree cafe.yaml --format=ai --component=schemas --name=MenuBaseItem
redocly tree cafe.yaml --format=ai --component=securitySchemes --name=OAuth2 --with-deps
```

{% /tab %}
{% tab label="Run 2" %}

```bash
redocly tree cafe.yaml --format=ai
redocly tree cafe.yaml --format=ai --path=/menu --operation=get --with-deps
redocly tree cafe.yaml --format=ai --path=/orders --operation=post --with-deps
redocly tree cafe.yaml --format=ai --path=/oauth2/register --operation=post --with-deps
redocly tree cafe.yaml --format=ai --path=/orders/{orderId} --operation=get --with-deps
redocly tree cafe.yaml --format=ai --path=/order-items --operation=get --with-deps
redocly tree cafe.yaml --format=ai --component=securitySchemes --name=OAuth2
redocly tree cafe.yaml --format=ai --find=webhook --with-deps
redocly tree cafe.yaml --format=ai --find=webhook
redocly tree cafe.yaml --format=ai --component=schemas --name=MenuBaseItem
redocly tree cafe.yaml --format=ai --path=/menu-item-images/{menuItemId} --operation=get
```

{% /tab %}
{% tab label="Run 3" %}

```bash
redocly tree cafe.yaml --format=ai
redocly tree cafe.yaml --format=ai --path=/menu --operation=get --with-deps
redocly tree cafe.yaml --format=ai --path=/orders --operation=post --with-deps
redocly tree cafe.yaml --format=ai --path=/orders/{orderId} --operation=get --with-deps
redocly tree cafe.yaml --format=ai --path=/oauth2/register --operation=post --with-deps
redocly tree cafe.yaml --format=ai --component=securitySchemes --name=OAuth2
redocly tree cafe.yaml --format=ai --find=order-notification --with-deps
redocly tree cafe.yaml --format=ai --find=order-notification
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% tab label="Opus 5" %}

{% tabs %}
{% tab label="Run 1" %}

```bash
redocly tree cafe.yaml --format=ai --path=/oauth2/register --operation=post --with-deps
redocly tree cafe.yaml --format=ai --component=securitySchemes
redocly tree cafe.yaml --format=ai --path=/menu --operation=get --with-deps
redocly tree cafe.yaml --format=ai --path=/orders --operation=post --with-deps
redocly tree cafe.yaml --format=ai --path=/orders/{orderId} --operation=get --with-deps
redocly tree cafe.yaml --format=ai --path=/menu-item-images/{menuItemId} --operation=get
redocly tree cafe.yaml --format=ai --path=/orders/{orderId} --operation=patch
redocly tree cafe.yaml --format=ai --path=/order-items --operation=get
redocly tree cafe.yaml --format=ai --component=schemas --name=OrderNotification
```

{% /tab %}
{% tab label="Run 2" %}

```bash
redocly tree cafe.yaml --format=ai
redocly tree --help
```

{% /tab %}
{% tab label="Run 3" %}

```bash
redocly tree cafe.yaml --format=ai
redocly tree --help
redocly tree cafe.yaml --format=ai --operation=registerOAuth2Client --with-deps
redocly tree cafe.yaml --format=ai --component=securitySchemes
redocly tree cafe.yaml --format=ai --component=securitySchemes --name=OAuth2 --with-deps
redocly tree cafe.yaml --format=ai --operation=listOrders
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% tab label="Fable 5" %}

{% tabs %}
{% tab label="Run 1" %}

```bash
redocly tree cafe.yaml --format=ai
redocly tree cafe.yaml --format=ai --path=/oauth2/register --operation=post --with-deps
redocly tree cafe.yaml --format=ai --path=/menu --operation=get --with-deps
redocly tree cafe.yaml --format=ai --path=/orders --operation=post --with-deps
redocly tree cafe.yaml --format=ai --path='/orders/{orderId}' --operation=get --with-deps
redocly tree cafe.yaml --format=ai --component=securitySchemes
redocly tree cafe.yaml --format=ai --component=securitySchemes --name=OAuth2 --with-deps
redocly tree cafe.yaml --format=ai --component=schemas --name=OrderItem
redocly tree cafe.yaml --format=ai --path='/menu-item-images/{menuItemId}' --operation=get
redocly tree cafe.yaml --format=ai --component=schemas --name=MenuBaseItem
```

{% /tab %}
{% tab label="Run 2" %}

```bash
redocly tree cafe.yaml --format=ai
redocly tree cafe.yaml --format=ai --path=/oauth2/register --operation=post --with-deps
redocly tree cafe.yaml --format=ai --component=securitySchemes
redocly tree cafe.yaml --format=ai --component=securitySchemes --name=OAuth2 --with-deps; redocly tree cafe.yaml --format=ai --component=securitySchemes --name=ApiKey
redocly tree cafe.yaml --format=ai --path=/menu --operation=get --with-deps
redocly tree cafe.yaml --format=ai --path=/orders --operation=post --with-deps
redocly tree cafe.yaml --format=ai --path='/orders/{orderId}' --operation=get --with-deps
redocly tree cafe.yaml --format=ai --component=schemas --name=Order --with-deps; redocly tree cafe.yaml --format=ai --component=schemas --name=MenuBaseItem
redocly tree cafe.yaml --format=ai --path='/menu-item-images/{menuItemId}' --operation=get
```

{% /tab %}
{% tab label="Run 3" %}

```bash
redocly tree cafe.yaml --format=ai
redocly tree cafe.yaml --format=ai --path=/oauth2/register --operation=post --with-deps
redocly tree cafe.yaml --format=ai --component=securitySchemes
redocly tree cafe.yaml --format=ai --component=securitySchemes --name=OAuth2 --with-deps
redocly tree cafe.yaml --format=ai --path=/menu --operation=get --with-deps
redocly tree cafe.yaml --format=ai --path=/orders --operation=post --with-deps
redocly tree cafe.yaml --format=ai --path='/orders/{orderId}' --operation=get --with-deps
redocly tree cafe.yaml --format=ai --component=schemas --name=Order --with-deps; redocly tree cafe.yaml --format=ai --component=schemas --name=MenuBaseItem
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% tab label="Haiku 4.5" %}

{% tabs %}
{% tab label="Run 1" %}

```bash
redocly tree cafe.yaml --format=ai
```

{% /tab %}
{% tab label="Run 2" %}

```bash
redocly tree cafe.yaml --format=ai
redocly tree cafe.yaml --format=ai --path=/menu --operation=get --with-deps
redocly tree cafe.yaml --format=ai --path=/orders --operation=post --with-deps
redocly tree cafe.yaml --format=ai --path=/orders/{orderId} --operation=get --with-deps
redocly tree cafe.yaml --format=ai --path=/oauth2/register --operation=post --with-deps
redocly tree cafe.yaml --format=ai --component=schemas --name=Beverage
redocly tree cafe.yaml --format=ai --component=schemas --name=MenuBaseItem
redocly tree cafe.yaml --format=ai --component=schemas --name=OrderItem
```

{% /tab %}
{% tab label="Run 3" %}

```bash
# this run made no tree call — it read the description instead
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% /tabs %}

At 41 KB the whole description fits in one read, and every model except Haiku 4.5 answers correctly either way.
Haiku 4.5 passes one run in three on both sides, dropping the token call the rest of the time.
This is the description where the index costs more calls than it saves — the alternative is a single read — and still halves the context, because a read pulls in the whole file.

{% /tab %}
{% /tabs %}

## The grid in one view

Context the run added, and the tool calls it took:

| Description | Model     |        no tree |           tree | Difference |
| ----------- | --------- | -------------: | -------------: | ---------: |
| GitHub REST | Sonnet 5  |    12,528 / 14 |     12,915 / 7 |        +3% |
| GitHub REST | Opus 5    |    16,462 / 13 |     16,284 / 9 |        −1% |
| GitHub REST | Fable 5   |    14,815 / 10 |     11,088 / 9 |       −25% |
| GitHub REST | Haiku 4.5 |  15,505 / 8 ❌ |      8,565 / 6 |       −45% |
| Billing API | Sonnet 5  | 31,179 / 32 ❌ | 25,231 / 11 ❌ |       −19% |
| Billing API | Opus 5    |    35,212 / 32 |    32,019 / 21 |        −9% |
| Billing API | Fable 5   |    32,043 / 30 |    18,329 / 11 |       −43% |
| Billing API | Haiku 4.5 | 19,459 / 16 ❌ | 17,174 / 14 ❌ |       −12% |
| Cafe API    | Sonnet 5  |     18,287 / 2 |      8,474 / 5 |       −54% |
| Cafe API    | Opus 5    |     16,769 / 1 |    17,103 / 11 |        +2% |
| Cafe API    | Fable 5   |     16,882 / 1 |      9,889 / 9 |       −41% |
| Cafe API    | Haiku 4.5 |     15,008 / 1 |      7,604 / 8 |       −49% |

Where both sides produce a working flow, the index is cheaper in seven of nine cells, by 1% to 54%.
The ❌ cells are cheap for the wrong reason: Haiku 4.5 covered the 10 MB GitHub description in eight calls for 15,505 tokens and still never minted the installation token its own flow declares.
Tool calls fall everywhere except the 41 KB Cafe API, where the alternative is one read of the whole file: on the billing API 21 against 32 for Opus 5 and 11 against 30 for Fable 5, on GitHub 7 against 14 for Sonnet 5.

What those runs were billed:

| Description | Model     |  no tree |     tree | Difference |
| ----------- | --------- | -------: | -------: | ---------: |
| GitHub REST | Sonnet 5  |    $0.39 |    $0.30 |       −23% |
| GitHub REST | Opus 5    |    $0.72 |    $0.61 |       −15% |
| GitHub REST | Fable 5   |    $1.00 |    $0.80 |       −20% |
| GitHub REST | Haiku 4.5 | $0.10 ❌ |    $0.08 |       −20% |
| Billing API | Sonnet 5  | $1.05 ❌ | $0.49 ❌ |       −53% |
| Billing API | Opus 5    |    $1.56 |    $1.00 |       −36% |
| Billing API | Fable 5   |    $2.82 |    $1.32 |       −53% |
| Billing API | Haiku 4.5 | $0.16 ❌ | $0.14 ❌ |       −12% |
| Cafe API    | Sonnet 5  |    $0.27 |    $0.26 |        −4% |
| Cafe API    | Opus 5    |    $0.41 |    $0.58 |       +41% |
| Cafe API    | Fable 5   |    $0.72 |    $0.82 |       +14% |
| Cafe API    | Haiku 4.5 |    $0.07 |    $0.09 |       +29% |

How many of the three runs in each cell produced a flow that would run:

| Description | Model     | no tree | tree |
| ----------- | --------- | ------: | ---: |
| GitHub REST | Sonnet 5  |     3/3 |  3/3 |
| GitHub REST | Opus 5    |     3/3 |  3/3 |
| GitHub REST | Fable 5   |     3/3 |  3/3 |
| GitHub REST | Haiku 4.5 |     0/3 |  1/3 |
| Billing API | Sonnet 5  |     0/3 |  0/3 |
| Billing API | Opus 5    |     3/3 |  3/3 |
| Billing API | Fable 5   |     3/3 |  3/3 |
| Billing API | Haiku 4.5 |     0/3 |  0/3 |
| Cafe API    | Sonnet 5  |     3/3 |  3/3 |
| Cafe API    | Opus 5    |     3/3 |  3/3 |
| Cafe API    | Fable 5   |     3/3 |  3/3 |
| Cafe API    | Haiku 4.5 |     1/3 |  1/3 |

Fifty-one of 72 runs produced a flow that would run.
One cell that never produced one without the index produced one with it, and no cell went the other way, but two cells failed on both sides: on the billing API, Sonnet 5 and Haiku 4.5 lay out the right sequence of calls and never authenticate it.

## What the failures were

| Reason                                                                              | Runs |
| ----------------------------------------------------------------------------------- | ---: |
| the `REB-APIKEY` header is never named, so no billing call would authenticate       |   10 |
| `POST /products` is missing, so the plan has nothing to sell                        |    6 |
| no call to mint the GitHub App installation token, though the flow says it uses one |    5 |
| no `POST /oauth2/token`, so the cafe order and its status return 401                |    4 |
| `POST /plans` is missing                                                            |    2 |
| the billing key is sent as `Authorization`, which this API rejects                  |    2 |

Every failure is either authentication or a resource a later call depends on.
Nothing fails on the part of the task that is stated out loud — the release, the order, the subscription — and everything fails on what the description holds and the task does not repeat.
On the Cafe API, where one read covers the whole description, both conditions find those. On the two large ones, a search that stops at the first plausible hit does not.

## How this was measured

Every run is a fresh Claude Code session started from the command line with the task text as its only input, allowed to run shell commands, read files and search them.
Sessions start in an empty directory with the description outside any repository, so no `AGENTS.md` or `CLAUDE.md` reaches the model; the tree runs call a published `@redocly/cli` snapshot.
Each cell is three runs, and the tables give the median.

**context** — from the run's transcript, over the `assistant` records that carry a `message.usage`.
A turn's context is `input_tokens + cache_read_input_tokens + cache_creation_input_tokens`, which is the whole prompt the model was handed on that turn; the table gives the last turn's minus the first turn's.
The first turn is the system prompt plus the task, so the subtraction drops a fixed cost that is identical in both conditions and drifts between batches.

**actions** — `tool_use` blocks in those same records. One shell call can chain several commands with `;`, so a run's command list is sometimes longer.

**cost** — `total_cost_usd` as the run itself reports it, not recomputed here.
It is the least reproducible number here: a warm prompt cache can halve it for identical work, so read it for shape. Prices differ per model, so amounts compare across a row, not down a column.

**working** — the answer is parsed for the calls it proposes and compared with the flow the description requires: every required call, the host each one goes to, the fields the request body requires, and the scheme that protects the operations.
The check accepts any JSON shape and any equivalent phrasing: a call addressed through a URL an earlier response returns — GitHub's `upload_url`, a CI template expression — counts as that call.
It reports only what is nowhere in the answer.
A cell whose runs all fail is marked ❌ rather than dropped, because the price of an answer that does not work rewards leaving things out and is worth seeing next to the price of one that runs.

**Noise.** Repeating a cell through the index lands within a few percent, without it by up to 83%, because the agent invents a fresh search strategy every time.
Treat anything under about 15% of context as a tie.
