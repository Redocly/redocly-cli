# Whether the flow an agent produces would actually run

The [first benchmark](./tree-agent-index-benchmark.md) asked an agent to name the calls a task needs, and measured what that cost.
This one asks for a working flow — the order of calls, what each one needs, what carries over — and then checks the answer against the description.
That check is the point: a run that skips the token call is cheap and useless, and the first benchmark could not tell it apart from a good one.

Three descriptions, four models, two conditions, three runs each — 72 runs:

- **no tree** — the task and the path to the file. Neither `tree` nor Redocly is named.
- **tree** — the same task plus one line: the CLI is installed, and `tree --format=ai <flags>` makes searching the description easier. No flags are listed and no documentation is linked.

Each run is measured by the context it added to its own session, with tool calls after the slash, by what it was billed, and by whether its flow passes the check.
How all four are counted is in [How this was measured](#how-this-was-measured) at the end.

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

| Model     |     no tree |        tree | Context |          Cost |   Working |
| --------- | ----------: | ----------: | ------: | ------------: | --------: |
| Sonnet 5  | 15,620 / 16 |  11,604 / 5 |    −26% | $0.46 → $0.27 | 2/3 → 1/3 |
| Opus 5    | 16,462 / 13 | 16,284 / 11 |     −1% | $0.72 → $0.67 | 3/3 → 2/3 |
| Fable 5   | 15,145 / 13 | 11,932 / 10 |    −21% | $1.09 → $0.85 | 1/3 → 2/3 |
| Haiku 4.5 |           — |   8,565 / 6 |       — |     — → $0.08 | 0/3 → 1/3 |

What the tree agent ran:

{% tabs %}
{% tab label="Sonnet 5" %}

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
{% tab label="Opus 5" %}

```bash
redocly tree github-api.yaml --format=ai
redocly tree github-api.yaml --format=ai --find="release asset"
redocly tree github-api.yaml --format=ai --path="/repos/{owner}/{repo}/releases" --operation=post
redocly tree github-api.yaml --format=ai --path="/repos/{owner}/{repo}/releases/{release_id}/assets" --operation=post
redocly tree github-api.yaml --format=ai --path="/repos/{owner}/{repo}/releases/assets/{asset_id}" --operation=delete
redocly tree github-api.yaml --format=ai --find="installation access token"
redocly tree github-api.yaml --format=ai --path="/app/installations/{installation_id}/access_tokens" --operation=post
redocly tree github-api.yaml --format=ai --component=schemas --name=installation-token
redocly tree github-api.yaml --format=ai --component=schemas --name=release-asset
redocly tree github-api.yaml --format=ai --component=schemas --name=release
redocly tree github-api.yaml --format=ai --component=schemas --name=app-permissions
```

{% /tab %}
{% tab label="Fable 5" %}

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
{% tab label="Haiku 4.5" %}

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

The upload is what runs get wrong: eight runs never attach the zip at all, and five never mint the token their own flow says it uses.
Opus 5 is the only model that passes without the index every time; Haiku 4.5 never does, and passes once with it.

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

| Model     |     no tree |        tree | Context |          Cost |   Working |
| --------- | ----------: | ----------: | ------: | ------------: | --------: |
| Sonnet 5  |           — | 28,164 / 13 |       — |     — → $0.55 | 0/3 → 1/3 |
| Opus 5    | 35,212 / 32 | 32,019 / 21 |     −9% | $1.56 → $1.00 | 3/3 → 3/3 |
| Fable 5   | 32,043 / 30 | 18,329 / 11 |    −43% | $2.82 → $1.32 | 3/3 → 3/3 |
| Haiku 4.5 |           — |           — |       — |         — → — | 0/3 → 0/3 |

What the tree agent ran:

{% tabs %}
{% tab label="Sonnet 5" %}

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
{% tab label="Opus 5" %}

```bash
redocly tree rebilly.yaml --format=ai
redocly tree --help
redocly tree rebilly.yaml --format=ai --tag=Plans
redocly tree rebilly.yaml --format=ai --tag=Products
redocly tree rebilly.yaml --format=ai --tag=Orders
redocly tree rebilly.yaml --format=ai --tag="Payment tokens"
redocly tree rebilly.yaml --format=ai --tag="Payment instruments"
redocly tree rebilly.yaml --format=ai --find="website"
redocly tree rebilly.yaml --format=ai --operation=PostProduct --with-deps
redocly tree rebilly.yaml --format=ai --operation=PostPlan --with-deps
redocly tree rebilly.yaml --format=ai --operation=PostSubscription --with-deps
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem --with-deps
redocly tree rebilly.yaml --format=ai --operation=PostPaymentInstrument --with-deps
redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanFormulaFlatRate --with-deps
redocly tree rebilly.yaml --format=ai --tag=Customers
redocly tree rebilly.yaml --format=ai --operation=PostToken --with-deps
redocly tree rebilly.yaml --format=ai --component=schemas --name=ContactObject
redocly tree rebilly.yaml --format=ai --component=securitySchemes
redocly tree rebilly.yaml --format=ai --tag=Invoices
```

{% /tab %}
{% tab label="Fable 5" %}

```bash
redocly tree rebilly.yaml --format=ai
redocly tree rebilly.yaml --format=ai --tag=Plans
redocly tree rebilly.yaml --format=ai --tag=Orders
redocly tree rebilly.yaml --format=ai --path=/products --operation=post --with-deps
redocly tree rebilly.yaml --format=ai --path=/plans --operation=post --with-deps
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionPlan
redocly tree rebilly.yaml --format=ai --path=/subscriptions --operation=post --with-deps
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem
redocly tree rebilly.yaml --format=ai --component=schemas --name=WebsiteId
redocly tree rebilly.yaml --format=ai --find=website
redocly tree rebilly.yaml --format=ai --component=schemas --name=OriginalPlan
redocly tree rebilly.yaml --format=ai --find=websites
redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanPriceFormula
redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanFormulaFlatRate
redocly tree rebilly.yaml --format=ai --tag=Customers
redocly tree rebilly.yaml --format=ai --component=securitySchemes
redocly tree rebilly.yaml --format=ai --component=securitySchemes --name=SecretApiKey
```

{% /tab %}
{% tab label="Haiku 4.5" %}

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

This run did not produce a working flow.

{% /tab %}
{% /tabs %}

This is where the index changes the outcome, not just the price: without it Sonnet 5 and Haiku 4.5 never produce a flow that would run.
Eleven runs across the grid name no authentication at all, and six start at the plan without creating the product it sells.

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

| Model     |    no tree |        tree | Context |          Cost |   Working |
| --------- | ---------: | ----------: | ------: | ------------: | --------: |
| Sonnet 5  | 18,287 / 2 |   8,474 / 5 |    −54% | $0.27 → $0.26 | 3/3 → 3/3 |
| Opus 5    | 16,769 / 1 | 17,103 / 11 |     +2% | $0.41 → $0.58 | 3/3 → 3/3 |
| Fable 5   | 16,882 / 1 |   9,889 / 9 |    −41% | $0.72 → $0.82 | 3/3 → 3/3 |
| Haiku 4.5 |          — |   7,604 / 8 |       — |     — → $0.09 | 0/3 → 1/3 |

What the tree agent ran:

{% tabs %}
{% tab label="Sonnet 5" %}

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
{% tab label="Opus 5" %}

```bash
redocly tree cafe.yaml --format=ai
redocly tree cafe.yaml --format=ai --path=/oauth2/register --operation=post --with-deps
redocly tree cafe.yaml --format=ai --component=securitySchemes
redocly tree cafe.yaml --format=ai --path=/menu --operation=get --with-deps
redocly tree cafe.yaml --format=ai --path=/orders --operation=post --with-deps
redocly tree cafe.yaml --format=ai --path=/orders/{orderId} --operation=get --with-deps
redocly tree cafe.yaml --format=ai --path=/menu-item-images/{menuItemId} --operation=get
redocly tree cafe.yaml --format=ai --path=/orders/{orderId} --operation=patch
redocly tree cafe.yaml --format=ai --path=/orders/{orderId} --operation=delete
redocly tree cafe.yaml --format=ai --path=/order-items --operation=get
redocly tree cafe.yaml --format=ai --component=schemas --name=OrderNotification
```

{% /tab %}
{% tab label="Fable 5" %}

```bash
redocly tree cafe.yaml --format=ai
redocly tree cafe.yaml --format=ai --path=/oauth2/register --operation=post --with-deps
redocly tree cafe.yaml --format=ai --component=securitySchemes
redocly tree cafe.yaml --format=ai --component=securitySchemes --name=OAuth2 --with-deps
redocly tree cafe.yaml --format=ai --path=/menu --operation=get --with-deps
redocly tree cafe.yaml --format=ai --path=/orders --operation=post --with-deps
redocly tree cafe.yaml --format=ai --path='/orders/{orderId}' --operation=get --with-deps
redocly tree cafe.yaml --format=ai --component=schemas --name=Order --with-deps
redocly tree cafe.yaml --format=ai --component=schemas --name=MenuBaseItem
```

{% /tab %}
{% tab label="Haiku 4.5" %}

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
{% /tabs %}

At 41 KB the whole description fits in one read, and every model except Haiku 4.5 answers correctly either way.
The index still halves the context on Sonnet 5 and Fable 5, and costs Opus 5 a little more, because it spends ten calls where a single read would do.

{% /tab %}
{% /tabs %}

## The grid in one view

Context the run added, and the tool calls it took, over the runs whose flow works:

| Description | Model     |     no tree |        tree | Difference |
| ----------- | --------- | ----------: | ----------: | ---------: |
| GitHub REST | Sonnet 5  | 15,620 / 16 |  11,604 / 5 |       −26% |
| GitHub REST | Opus 5    | 16,462 / 13 | 16,284 / 11 |        −1% |
| GitHub REST | Fable 5   | 15,145 / 13 | 11,932 / 10 |       −21% |
| GitHub REST | Haiku 4.5 |           — |   8,565 / 6 |          — |
| Billing API | Sonnet 5  |           — | 28,164 / 13 |          — |
| Billing API | Opus 5    | 35,212 / 32 | 32,019 / 21 |        −9% |
| Billing API | Fable 5   | 32,043 / 30 | 18,329 / 11 |       −43% |
| Billing API | Haiku 4.5 |           — |           — |          — |
| Cafe API    | Sonnet 5  |  18,287 / 2 |   8,474 / 5 |       −54% |
| Cafe API    | Opus 5    |  16,769 / 1 | 17,103 / 11 |        +2% |
| Cafe API    | Fable 5   |  16,882 / 1 |   9,889 / 9 |       −41% |
| Cafe API    | Haiku 4.5 |           — |   7,604 / 8 |          — |

Where both sides produce a working flow, the index is cheaper in six of eight cells, by 1% to 54%.
Tool calls fall on the two large descriptions — 21 against 32 on the billing API, 5 against 16 on GitHub — and rise on the 41 KB Cafe API, where the alternative is one read of the whole file.

How often the flow worked, and what it was billed:

| Description | Model     | no tree | tree | Cost, no tree → tree |
| ----------- | --------- | ------: | ---: | -------------------- |
| GitHub REST | Sonnet 5  |     2/3 |  1/3 | $0.46 → $0.27        |
| GitHub REST | Opus 5    |     3/3 |  2/3 | $0.72 → $0.67        |
| GitHub REST | Fable 5   |     1/3 |  2/3 | $1.09 → $0.85        |
| GitHub REST | Haiku 4.5 |     0/3 |  1/3 | — → $0.08            |
| Billing API | Sonnet 5  |     0/3 |  1/3 | — → $0.55            |
| Billing API | Opus 5    |     3/3 |  3/3 | $1.56 → $1.00        |
| Billing API | Fable 5   |     3/3 |  3/3 | $2.82 → $1.32        |
| Billing API | Haiku 4.5 |     0/3 |  0/3 | — → —                |
| Cafe API    | Sonnet 5  |     3/3 |  3/3 | $0.27 → $0.26        |
| Cafe API    | Opus 5    |     3/3 |  3/3 | $0.41 → $0.58        |
| Cafe API    | Fable 5   |     3/3 |  3/3 | $0.72 → $0.82        |
| Cafe API    | Haiku 4.5 |     0/3 |  1/3 | — → $0.09            |

Forty-four of 72 runs produced a flow that would run.
Three cells never produced one without the index and two of them did with it, while no cell went the other way: on the large descriptions the index does not only change the price, it changes whether the weaker models arrive at a usable answer at all.

## What the failures were

| Reason                                                                              | Runs |
| ----------------------------------------------------------------------------------- | ---: |
| the `SecretApiKey` header is never named, so no billing call would authenticate     |   11 |
| the asset upload is missing, so nothing is attached to the release                  |    8 |
| `POST /products` is missing, so the plan has nothing to sell                        |    6 |
| no call to mint the GitHub App installation token, though the flow says it uses one |    5 |
| no `POST /oauth2/token`, so the cafe order and its status return 401                |    4 |
| `POST /plans` is missing                                                            |    2 |
| no `GET /orders/{orderId}`; that run substituted the operator order list            |    1 |
| the asset delete is missing                                                         |    1 |

What gets dropped is the step outside the obvious happy path: the token, the upload host, the resource that the next call depends on.
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
The check accepts any JSON shape and any equivalent phrasing, and reports only what is nowhere in the answer.
Runs that fail it are left out of the context and cost tables, since the price of an answer that does not work rewards leaving things out.

**Noise.** Repeating a cell through the index lands within a few percent, without it by up to 83%, because the agent invents a fresh search strategy every time.
Treat anything under about 15% of context as a tie.
