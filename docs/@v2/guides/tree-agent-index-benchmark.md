# Where the index pays

An agent handed an API description has three ways to work: read and search the file, ask [`tree`](../commands/tree.md) for an index of it, or search a map of it generated ahead of time with [`generate-map`](../commands/generate-map.md).
This measures all three on the same tasks — eight description-task pairs, from 41 KB to 2,909 files, two of them the same description in the opposite layout — and judges the answer, not the effort: does the flow the agent produces actually run?

**543 of 720 runs produced a working flow: 158 of 240 reading the description, 184 of 240 exploring it with `tree`, 201 of 240 searching a pre-generated map.**
An index rarely changes what a strong model can do. What it changes is whether a smaller one gets there at all, and what the answer costs to reach — and the pre-generated map changes that most: Haiku 4.5 works in 46 runs against 32 with `tree` and 25 with neither.

## What it changes

| Description            | Model     | works: no tree → tree → map |  no tree |  tree |   map | Δ tree | Δ map |
| ---------------------- | --------- | --------------------------: | -------: | ----: | ----: | -----: | ----: |
| GitHub REST            | Sonnet 5  |        10/10 → 10/10 → 8/10 |    $0.41 | $0.31 | $0.18 |   −24% |  −55% |
| GitHub REST            | Opus 5    |        10/10 → 10/10 → 9/10 |    $0.79 | $0.66 | $0.59 |   −16% |  −26% |
| GitHub REST            | Haiku 4.5 |          3/10 → 3/10 → 1/10 |    $0.10 | $0.10 | $0.09 |    −3% |  −16% |
| GitHub REST (split)    | Sonnet 5  |          9/10 → 9/10 → 9/10 |    $0.21 | $0.24 | $0.19 |   +14% |   −8% |
| GitHub REST (split)    | Opus 5    |         8/10 → 9/10 → 10/10 |    $0.65 | $0.69 | $0.54 |    +7% |  −16% |
| GitHub REST (split)    | Haiku 4.5 |          5/10 → 1/10 → 2/10 |    $0.16 | $0.14 | $0.08 |   −18% |  −49% |
| Billing API            | Sonnet 5  |          2/10 → 6/10 → 9/10 |    $1.01 | $0.59 | $0.80 |   −41% |  −21% |
| Billing API            | Opus 5    |       10/10 → 10/10 → 10/10 |    $1.74 | $1.10 | $2.22 |   −37% |  +28% |
| Billing API            | Haiku 4.5 |          0/10 → 1/10 → 3/10 | $0.18 ❌ | $0.17 | $0.25 |      — |     — |
| Stripe                 | Sonnet 5  |        9/10 → 10/10 → 10/10 |    $0.32 | $0.25 | $0.25 |   −22% |  −24% |
| Stripe                 | Opus 5    |       10/10 → 10/10 → 10/10 |    $0.55 | $0.44 | $0.67 |   −19% |  +22% |
| Stripe                 | Haiku 4.5 |         0/10 → 8/10 → 10/10 | $0.10 ❌ | $0.12 | $0.14 |      — |     — |
| PayPal Orders          | Sonnet 5  |        9/10 → 10/10 → 10/10 |    $0.39 | $0.44 | $0.34 |   +11% |  −14% |
| PayPal Orders          | Opus 5    |       10/10 → 10/10 → 10/10 |    $0.75 | $1.06 | $0.75 |   +40% |   +0% |
| PayPal Orders          | Haiku 4.5 |          4/10 → 4/10 → 2/10 |    $0.13 | $0.11 | $0.11 |   −13% |  −19% |
| DigitalOcean           | Sonnet 5  |         3/10 → 9/10 → 10/10 |    $0.35 | $0.36 | $0.23 |    +1% |  −35% |
| DigitalOcean           | Opus 5    |       10/10 → 10/10 → 10/10 |    $0.57 | $0.80 | $0.71 |   +40% |  +24% |
| DigitalOcean           | Haiku 4.5 |         4/10 → 4/10 → 10/10 |    $0.19 | $0.12 | $0.16 |   −33% |  −15% |
| DigitalOcean (bundled) | Sonnet 5  |        5/10 → 10/10 → 10/10 |    $0.29 | $0.17 | $0.25 |   −42% |  −13% |
| DigitalOcean (bundled) | Opus 5    |        8/10 → 10/10 → 10/10 |    $0.83 | $0.88 | $0.75 |    +5% |  −10% |
| DigitalOcean (bundled) | Haiku 4.5 |          3/10 → 5/10 → 8/10 |    $0.19 | $0.12 | $0.14 |   −37% |  −25% |
| Cafe API               | Sonnet 5  |        10/10 → 9/10 → 10/10 |    $0.25 | $0.30 | $0.25 |   +20% |   −2% |
| Cafe API               | Opus 5    |       10/10 → 10/10 → 10/10 |    $0.46 | $0.66 | $0.70 |   +42% |  +51% |
| Cafe API               | Haiku 4.5 |         6/10 → 6/10 → 10/10 |    $0.07 | $0.10 | $0.08 |   +45% |  +18% |

## The price of a working answer

The grid above prices an average working run; this table adds the failed attempts to that bill: the mean working run times total runs over working runs.
With five of ten working at a $0.28 average, a working answer really costs $0.56.

| Model      | no tree |  tree |   map |
| ---------- | ------: | ----: | ----: |
| Sonnet 5   |   $0.48 | $0.35 | $0.33 |
| Opus 5     |   $0.84 | $0.80 | $0.88 |
| Haiku 4.5  |   $0.43 | $0.29 | $0.23 |
| All models |   $0.80 | $0.63 | $0.58 |

One description skews Opus 5: on the billing API a working map answer costs about twice its `tree` price, and that pair alone tips its total. The per-description breakdown is in [the detailed version](./tree-agent-index-benchmark-detailed.md).

## The head-to-heads

{% tabs %}

{% tab label="GitHub REST · publish a release" %}

**Description:** 9.52 MB in one file.

**Task:** a CI job that publishes a release, attaches the built zip, and can take that file back down, authenticating as a GitHub App installation.
Expected: `POST /app/installations/{id}/access_tokens` → `POST /releases` → the asset upload → `DELETE /releases/assets/{asset_id}`.

**The trap:** the upload overrides its server to `uploads.github.com`, and the delete is keyed by asset, not release.

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

The Redocly CLI is installed and its `tree` command can search the description for you.
Start with `redocly tree --help` to see what it can select, then work with `--format=ai`:
redocly tree github-api.yaml --format=ai <flags>

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% tab label="Prompt: map" %}

```text
I want a CI job that publishes a release for a repository, attaches the built zip to it,
and can take that file back down if the upload turns out wrong. Work out what it calls.
The CI authenticates as a GitHub App installation.

API description: github-api.yaml
Next to it is github-api.map.txt — a generated index of every operation in this API:
auth, required fields, what to carry from each response, and source line ranges.
Start there.

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% /tabs %}

| Model     | works: no tree → tree → map | no tree |  tree |   map | Δ tree | Δ map |
| --------- | --------------------------: | ------: | ----: | ----: | -----: | ----: |
| Sonnet 5  |        10/10 → 10/10 → 8/10 |   $0.41 | $0.31 | $0.18 |   −24% |  −55% |
| Opus 5    |        10/10 → 10/10 → 9/10 |   $0.79 | $0.66 | $0.59 |   −16% |  −26% |
| Haiku 4.5 |          3/10 → 3/10 → 1/10 |   $0.10 | $0.10 | $0.09 |    −3% |  −16% |

What the failing runs left out:

- **Haiku 4.5 · no tree** — 5 runs: no app token
- **Haiku 4.5 · no tree** — 1 run: no asset upload
- **Haiku 4.5 · no tree** — 1 run: no app token, no asset upload
- **Haiku 4.5 · tree** — 2 runs: no app token, no asset upload
- **Haiku 4.5 · tree** — 5 runs: no app token
- **Sonnet 5 · map** — 2 runs: no app token
- **Opus 5 · map** — 1 run: no asset upload
- **Haiku 4.5 · map** — 9 runs: no app token

Sonnet 5 and Opus 5 answer correctly either way; the index buys 9% to 13% less context and fewer calls. Haiku 4.5 never mints the installation token its own flow declares.

{% /tab %}

{% tab label="GitHub REST (split) · publish a release" %}

**Description:** 16 MB across 2,842 files — the same GitHub description split into one file per operation with `redocly split`.

**Task:** a CI job that publishes a release, attaches the built zip, and can take that file back down, authenticating as a GitHub App installation.
Expected: `POST /app/installations/{id}/access_tokens` → `POST /releases` → the asset upload → `DELETE /releases/assets/{asset_id}`.

**The trap:** the upload overrides its server to `uploads.github.com`, and the delete is keyed by asset, not release.

{% tabs %}
{% tab label="Prompt: no tree" %}

```text
I want a CI job that publishes a release for a repository, attaches the built zip to it,
and can take that file back down if the upload turns out wrong. Work out what it calls.
The CI authenticates as a GitHub App installation.

API description: github-split/openapi.yaml

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% tab label="Prompt: tree" %}

```text
I want a CI job that publishes a release for a repository, attaches the built zip to it,
and can take that file back down if the upload turns out wrong. Work out what it calls.
The CI authenticates as a GitHub App installation.

API description: github-split/openapi.yaml

The Redocly CLI is installed and its `tree` command can search the description for you.
Start with `redocly tree --help` to see what it can select, then work with `--format=ai`:
redocly tree github-split/openapi.yaml --format=ai <flags>

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% tab label="Prompt: map" %}

```text
I want a CI job that publishes a release for a repository, attaches the built zip to it,
and can take that file back down if the upload turns out wrong. Work out what it calls.
The CI authenticates as a GitHub App installation.

API description: github-split/openapi.yaml
Next to it is github-split/openapi.map.txt — a generated index of every operation in this API:
auth, required fields, what to carry from each response, and source line ranges.
Start there.

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% /tabs %}

| Model     | works: no tree → tree → map | no tree |  tree |   map | Δ tree | Δ map |
| --------- | --------------------------: | ------: | ----: | ----: | -----: | ----: |
| Sonnet 5  |          9/10 → 9/10 → 9/10 |   $0.21 | $0.24 | $0.19 |   +14% |   −8% |
| Opus 5    |         8/10 → 9/10 → 10/10 |   $0.65 | $0.69 | $0.54 |    +7% |  −16% |
| Haiku 4.5 |          5/10 → 1/10 → 2/10 |   $0.16 | $0.14 | $0.08 |   −18% |  −49% |

What the failing runs left out:

- **Sonnet 5 · no tree** — 1 run: no app token
- **Sonnet 5 · tree** — 1 run: no app token
- **Opus 5 · no tree** — 2 runs: no asset upload
- **Opus 5 · tree** — 1 run: no asset upload
- **Haiku 4.5 · no tree** — 3 runs: no app token
- **Haiku 4.5 · no tree** — 1 run: no asset delete
- **Haiku 4.5 · no tree** — 1 run: no app token, no asset upload
- **Haiku 4.5 · tree** — 8 runs: no app token
- **Haiku 4.5 · tree** — 1 run: no app token, no asset upload
- **Sonnet 5 · map** — 1 run: no app token
- **Haiku 4.5 · map** — 7 runs: no app token
- **Haiku 4.5 · map** — 1 run: no asset upload

Split into a file per operation, the layout is itself the index, and the advantage the command held on the 9.5 MB single file is gone: the control gets twice as cheap, Sonnet 5 pays 14% more through the index, and Haiku 4.5 drops from five working runs to one, losing the installation-token call among the cards.

{% /tab %}

{% tab label="Billing API · start a subscription" %}

**Description:** 1.25 MB in one file.

**Task:** put an existing customer onto a recurring plan, with nothing else set up yet.
Expected: `POST /products` → `POST /plans` → `POST /subscriptions`.

**The trap:** the subscription body needs four named fields, and every call needs the key in the `REB-APIKEY` header.

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

The Redocly CLI is installed and its `tree` command can search the description for you.
Start with `redocly tree --help` to see what it can select, then work with `--format=ai`:
redocly tree rebilly.yaml --format=ai <flags>

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% tab label="Prompt: map" %}

```text
We're moving existing customers onto monthly recurring billing. One of them is already in
the system, nothing else is set up yet. Work out what our backend has to call to get that
customer onto a recurring plan.

API description: rebilly.yaml
Next to it is rebilly.map.txt — a generated index of every operation in this API:
auth, required fields, what to carry from each response, and source line ranges.
Start there.

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% /tabs %}

| Model     | works: no tree → tree → map |  no tree |  tree |   map | Δ tree | Δ map |
| --------- | --------------------------: | -------: | ----: | ----: | -----: | ----: |
| Sonnet 5  |          2/10 → 6/10 → 9/10 |    $1.01 | $0.59 | $0.80 |   −41% |  −21% |
| Opus 5    |       10/10 → 10/10 → 10/10 |    $1.74 | $1.10 | $2.22 |   −37% |  +28% |
| Haiku 4.5 |          0/10 → 1/10 → 3/10 | $0.18 ❌ | $0.17 | $0.25 |      — |     — |

What the failing runs left out:

- **Sonnet 5 · no tree** — 6 runs: no auth scheme
- **Sonnet 5 · no tree** — 1 run: no product call, no auth scheme
- **Sonnet 5 · no tree** — 1 run: wrong auth header
- **Sonnet 5 · tree** — 4 runs: no auth scheme
- **Haiku 4.5 · no tree** — 3 runs: no product call, no plan call, no auth scheme
- **Haiku 4.5 · no tree** — 6 runs: no product call, no auth scheme
- **Haiku 4.5 · no tree** — 1 run: no product call, no plan call, no orderType field, no auth scheme
- **Haiku 4.5 · tree** — 1 run: no product call, no plan call
- **Haiku 4.5 · tree** — 5 runs: no product call, no auth scheme
- **Haiku 4.5 · tree** — 3 runs: no product call
- **Sonnet 5 · map** — 1 run: no product call, no plan call
- **Haiku 4.5 · map** — 2 runs: no product call, no plan call, no orderType field
- **Haiku 4.5 · map** — 1 run: no product call, no plan call
- **Haiku 4.5 · map** — 1 run: no product call, no orderType field
- **Haiku 4.5 · map** — 3 runs: no product call

The index turns Sonnet 5 from nothing that runs into four flows in five, and halves what Opus 5 pays. Every control failure here is the same one: the secret key never reaches the request.

{% /tab %}

{% tab label="Stripe · buy carbon removal" %}

**Description:** 6.07 MB in one file — the same file as the previous tab.

**Task:** buy carbon removal — pick a product from what's on offer, order a set number of metric tons, and be able to cancel before delivery.
Expected: `GET /v1/climate/products` → `POST /v1/climate/orders` → `POST /v1/climate/orders/{order}/cancel`.
The point of this description: it is the same file as the previous tab, but a corner no tutorial covers — a model cannot answer it from memory, only from the description. Traps: the quantity rides on `metric_tons`, the cancel is its own `POST`, and payment comes off the merchant balance, so the payment-intent machinery a Stripe-trained prior reaches for has no place here.

**The trap:** the quantity rides on `metric_tons`, the cancel is its own `POST`, and payment comes off the merchant balance.

{% tabs %}
{% tab label="Prompt: no tree" %}

```text
Our company committed to buying carbon removal. Pick a removal product from what's on
offer, place an order for a set number of metric tons, and be able to cancel that order
before delivery if finance rejects the spend. Work out what our backend has to call.

API description: climate.yaml

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% tab label="Prompt: tree" %}

```text
Our company committed to buying carbon removal. Pick a removal product from what's on
offer, place an order for a set number of metric tons, and be able to cancel that order
before delivery if finance rejects the spend. Work out what our backend has to call.

API description: climate.yaml

The Redocly CLI is installed and its `tree` command can search the description for you.
Start with `redocly tree --help` to see what it can select, then work with `--format=ai`:
redocly tree climate.yaml --format=ai <flags>

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% tab label="Prompt: map" %}

```text
Our company committed to buying carbon removal. Pick a removal product from what's on
offer, place an order for a set number of metric tons, and be able to cancel that order
before delivery if finance rejects the spend. Work out what our backend has to call.

API description: climate.yaml
Next to it is climate.map.txt — a generated index of every operation in this API:
auth, required fields, what to carry from each response, and source line ranges.
Start there.

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% /tabs %}

| Model     | works: no tree → tree → map |  no tree |  tree |   map | Δ tree | Δ map |
| --------- | --------------------------: | -------: | ----: | ----: | -----: | ----: |
| Sonnet 5  |        9/10 → 10/10 → 10/10 |    $0.32 | $0.25 | $0.25 |   −22% |  −24% |
| Opus 5    |       10/10 → 10/10 → 10/10 |    $0.55 | $0.44 | $0.67 |   −19% |  +22% |
| Haiku 4.5 |         0/10 → 8/10 → 10/10 | $0.10 ❌ | $0.12 | $0.14 |      — |     — |

What the failing runs left out:

- **Sonnet 5 · no tree** — 1 run: no auth scheme
- **Haiku 4.5 · no tree** — 10 runs: no auth scheme
- **Haiku 4.5 · tree** — 2 runs: no auth scheme

The same file, a corner no tutorial covers, and the picture inverts: every model finds the calls, and Haiku 4.5 goes from none of ten to eight. Its control runs name the right calls and never say how they authenticate; with the index they quote the `security:` line back.

{% /tab %}

{% tab label="PayPal Orders · capture and track" %}

**Description:** 0.93 MB in one file, JSON rather than YAML.

**Task:** take the buyer's payment for a cart, capture it once they approve, and file the shipment's tracking number against that payment.
Expected: `POST /v2/checkout/orders` → `POST /v2/checkout/orders/{id}/capture` → `POST /v2/checkout/orders/{id}/track`.

**The trap:** the tracker binds to the `capture_id` from the capture response, not to the order.

{% tabs %}
{% tab label="Prompt: no tree" %}

```text
We sell physical goods online: take the buyer's payment for a cart, capture the money once
they approve, and file the shipment's tracking number against that payment so the buyer
sees it. Work out what our backend has to call, end to end.

API description: paypal.json

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% tab label="Prompt: tree" %}

```text
We sell physical goods online: take the buyer's payment for a cart, capture the money once
they approve, and file the shipment's tracking number against that payment so the buyer
sees it. Work out what our backend has to call, end to end.

API description: paypal.json

The Redocly CLI is installed and its `tree` command can search the description for you.
Start with `redocly tree --help` to see what it can select, then work with `--format=ai`:
redocly tree paypal.json --format=ai <flags>

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% tab label="Prompt: map" %}

```text
We sell physical goods online: take the buyer's payment for a cart, capture the money once
they approve, and file the shipment's tracking number against that payment so the buyer
sees it. Work out what our backend has to call, end to end.

API description: paypal.json
Next to it is paypal.map.txt — a generated index of every operation in this API:
auth, required fields, what to carry from each response, and source line ranges.
Start there.

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% /tabs %}

| Model     | works: no tree → tree → map | no tree |  tree |   map | Δ tree | Δ map |
| --------- | --------------------------: | ------: | ----: | ----: | -----: | ----: |
| Sonnet 5  |        9/10 → 10/10 → 10/10 |   $0.39 | $0.44 | $0.34 |   +11% |  −14% |
| Opus 5    |       10/10 → 10/10 → 10/10 |   $0.75 | $1.06 | $0.75 |   +40% |   +0% |
| Haiku 4.5 |          4/10 → 4/10 → 2/10 |   $0.13 | $0.11 | $0.11 |   −13% |  −19% |

What the failing runs left out:

- **Sonnet 5 · no tree** — 1 run: no auth scheme
- **Haiku 4.5 · no tree** — 1 run: no intent field, no auth scheme
- **Haiku 4.5 · no tree** — 1 run: no intent field, no tracker call
- **Haiku 4.5 · no tree** — 1 run: no tracker call, no auth scheme
- **Haiku 4.5 · no tree** — 1 run: no carrier field
- **Haiku 4.5 · no tree** — 1 run: no carrier field, no auth scheme
- **Haiku 4.5 · no tree** — 1 run: no auth scheme
- **Haiku 4.5 · tree** — 1 run: no carrier field
- **Haiku 4.5 · tree** — 3 runs: no intent field
- **Haiku 4.5 · tree** — 2 runs: no intent field, no carrier field
- **Haiku 4.5 · map** — 1 run: no intent field
- **Haiku 4.5 · map** — 2 runs: no intent field, no carrier field
- **Haiku 4.5 · map** — 5 runs: no carrier field

Opus 5 passes every run either way and Sonnet 5 misses one without the index. Both pay more context with it — nine operations barely need finding, and the cards arrive carrying PayPal's deep schemas — which for Opus 5 lands as 26% more billed.
Haiku 4.5 stays at four working runs, still leaving `intent` out of the order body.

{% /tab %}

{% tab label="DigitalOcean · shared file storage" %}

**Description:** 2.62 MB across 2,909 files — the same description as the previous tab.

**Task:** shared storage for a cluster — a network file share in one region reachable from a private network, plus a second export path a different private network can mount.
Expected: `POST /v2/nfs` → `POST /v2/nfs/shares/{share_id}/access_points`.

**The trap:** the share takes a `vpc_ids` array while an access point takes one `vpc_id`.

{% tabs %}
{% tab label="Prompt: no tree" %}

```text
We need shared storage for a cluster: a network file share in one region, reachable from
our private network, plus a second export path that a different private network can
mount. Nothing is set up yet. Work out what our provisioning script has to call.

API description: digitalocean/DigitalOcean-public.v2.yaml

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% tab label="Prompt: tree" %}

```text
We need shared storage for a cluster: a network file share in one region, reachable from
our private network, plus a second export path that a different private network can
mount. Nothing is set up yet. Work out what our provisioning script has to call.

API description: digitalocean/DigitalOcean-public.v2.yaml

The Redocly CLI is installed and its `tree` command can search the description for you.
Start with `redocly tree --help` to see what it can select, then work with `--format=ai`:
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai <flags>

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% tab label="Prompt: map" %}

```text
We need shared storage for a cluster: a network file share in one region, reachable from
our private network, plus a second export path that a different private network can
mount. Nothing is set up yet. Work out what our provisioning script has to call.

API description: digitalocean/DigitalOcean-public.v2.yaml
Next to it is digitalocean/DigitalOcean-public.v2.map.txt — a generated index of every operation in this API:
auth, required fields, what to carry from each response, and source line ranges.
Start there.

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% /tabs %}

| Model     | works: no tree → tree → map | no tree |  tree |   map | Δ tree | Δ map |
| --------- | --------------------------: | ------: | ----: | ----: | -----: | ----: |
| Sonnet 5  |         3/10 → 9/10 → 10/10 |   $0.35 | $0.36 | $0.23 |    +1% |  −35% |
| Opus 5    |       10/10 → 10/10 → 10/10 |   $0.57 | $0.80 | $0.71 |   +40% |  +24% |
| Haiku 4.5 |         4/10 → 4/10 → 10/10 |   $0.19 | $0.12 | $0.16 |   −33% |  −15% |

What the failing runs left out:

- **Sonnet 5 · no tree** — 7 runs: no auth scheme
- **Sonnet 5 · tree** — 1 run: no auth scheme
- **Haiku 4.5 · no tree** — 1 run: no vpc_ids field, no auth scheme
- **Haiku 4.5 · no tree** — 1 run: no auth scheme
- **Haiku 4.5 · no tree** — 4 runs: no access point call, no auth scheme
- **Haiku 4.5 · tree** — 4 runs: no auth scheme
- **Haiku 4.5 · tree** — 1 run: no share call, no access point call
- **Haiku 4.5 · tree** — 1 run: no share call, no access point call, no auth scheme

The same 2,909 files, a corner the tutorials skip: Sonnet 5 moves from three working runs in ten to nine, the largest single move in the grid, while Haiku 4.5 stays at four and only gets there cheaper. Opus 5 passes either way and pays 39% more for it — with one operation per file, the filenames are already an index. The second of two controls in this grid for what a model remembers versus what it reads.

{% /tab %}

{% tab label="DigitalOcean (bundled) · shared file storage" %}

**Description:** 2.87 MB in one file — the 2,909-file DigitalOcean description bundled into a single document with `redocly bundle`.

**Task:** shared storage for a cluster — a network file share in one region reachable from a private network, plus a second export path a different private network can mount.
Expected: `POST /v2/nfs` → `POST /v2/nfs/shares/{share_id}/access_points`.

**The trap:** the share binds to networks through a `vpc_ids` array while an access point takes a single `vpc_id`, and the file-per-operation layout that made this cheap to `cat` is gone.

{% tabs %}
{% tab label="Prompt: no tree" %}

```text
We need shared storage for a cluster: a network file share in one region, reachable from
our private network, plus a second export path that a different private network can
mount. Nothing is set up yet. Work out what our provisioning script has to call.

API description: digitalocean-bundled.yaml

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% tab label="Prompt: tree" %}

```text
We need shared storage for a cluster: a network file share in one region, reachable from
our private network, plus a second export path that a different private network can
mount. Nothing is set up yet. Work out what our provisioning script has to call.

API description: digitalocean-bundled.yaml

The Redocly CLI is installed and its `tree` command can search the description for you.
Start with `redocly tree --help` to see what it can select, then work with `--format=ai`:
redocly tree digitalocean-bundled.yaml --format=ai <flags>

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% tab label="Prompt: map" %}

```text
We need shared storage for a cluster: a network file share in one region, reachable from
our private network, plus a second export path that a different private network can
mount. Nothing is set up yet. Work out what our provisioning script has to call.

API description: digitalocean-bundled.yaml
Next to it is digitalocean-bundled.map.txt — a generated index of every operation in this API:
auth, required fields, what to carry from each response, and source line ranges.
Start there.

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% /tabs %}

| Model     | works: no tree → tree → map | no tree |  tree |   map | Δ tree | Δ map |
| --------- | --------------------------: | ------: | ----: | ----: | -----: | ----: |
| Sonnet 5  |        5/10 → 10/10 → 10/10 |   $0.29 | $0.17 | $0.25 |   −42% |  −13% |
| Opus 5    |        8/10 → 10/10 → 10/10 |   $0.83 | $0.88 | $0.75 |    +5% |  −10% |
| Haiku 4.5 |          3/10 → 5/10 → 8/10 |   $0.19 | $0.12 | $0.14 |   −37% |  −25% |

What the failing runs left out:

- **Sonnet 5 · no tree** — 5 runs: no auth scheme
- **Opus 5 · no tree** — 2 runs: no access point call
- **Haiku 4.5 · no tree** — 6 runs: no auth scheme
- **Haiku 4.5 · no tree** — 1 run: no access point call, no auth scheme
- **Haiku 4.5 · tree** — 1 run: no share call, no access point call, no auth scheme
- **Haiku 4.5 · tree** — 4 runs: no auth scheme
- **Haiku 4.5 · map** — 2 runs: no auth scheme

Bundled into one 2.87 MB file, the description stops answering "where is it" by itself: Sonnet 5 goes from five working runs to all ten at half the cost through the index, and Opus 5 drops two control runs it passed on the split layout.

{% /tab %}

{% tab label="Cafe API · order a coffee" %}

**Description:** 0.04 MB in one file.

**Task:** a customer app that browses the menu, orders a coffee, and follows the order until it is ready.
Expected: `POST /oauth2/token` → `GET /menu` → `POST /orders` → `GET /orders/{orderId}`.

**The trap:** ordering needs an OAuth2 token with the `orders:write` scope, minted by a call the task never mentions.

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

The Redocly CLI is installed and its `tree` command can search the description for you.
Start with `redocly tree --help` to see what it can select, then work with `--format=ai`:
redocly tree cafe.yaml --format=ai <flags>

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% tab label="Prompt: map" %}

```text
I'm building a mobile app for a cafe: the customer browses the menu, orders a coffee,
and follows that order until it's ready. Work out what the app has to call, end to end.

API description: cafe.yaml
Next to it is cafe.map.txt — a generated index of every operation in this API:
auth, required fields, what to carry from each response, and source line ranges.
Start there.

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% /tabs %}

| Model     | works: no tree → tree → map | no tree |  tree |   map | Δ tree | Δ map |
| --------- | --------------------------: | ------: | ----: | ----: | -----: | ----: |
| Sonnet 5  |        10/10 → 9/10 → 10/10 |   $0.25 | $0.30 | $0.25 |   +20% |   −2% |
| Opus 5    |       10/10 → 10/10 → 10/10 |   $0.46 | $0.66 | $0.70 |   +42% |  +51% |
| Haiku 4.5 |         6/10 → 6/10 → 10/10 |   $0.07 | $0.10 | $0.08 |   +45% |  +18% |

What the failing runs left out:

- **Sonnet 5 · tree** — 1 run: no token call
- **Haiku 4.5 · no tree** — 4 runs: no token call
- **Haiku 4.5 · tree** — 4 runs: no token call

At 41 KB the whole description fits in one read, and all thirty control runs take it — one call and the model has everything.
The index still cuts Sonnet 5's context nearly in half, and still costs more: it turns that one read into seven to thirteen calls, and each call is a fresh request carrying the whole conversation again. Sonnet 5 is the clearest case in the grid — 48% less context, 17% more billed.
Haiku 4.5 loses the token call among the cards exactly as often as it loses it in the file.

{% /tab %}

{% /tabs %}

## What the numbers show

- **Correctness:** map 201/240, `tree` 184, plain reading 158 — and the gap is almost all Haiku 4.5: 25 → 32 → 46 working runs.
- **Price:** both indexes are cheaper than reading the description on the large single-file APIs, and dearer on the small and the file-per-operation ones.
- **The failure an index removes is auth:** runs without one name the right calls and never say how the request authenticates.
- **What the description never states, no index can carry:** GitHub's token-minting call is not marked as a security requirement, and Haiku 4.5 skips it under every condition.

## How this was measured

Every run is a fresh Claude Code session in a directory holding only the description — plus, in the map condition, the map `generate-map` wrote beforehand — with the task text as the only input.
**no tree** names no tooling; **tree** adds two lines pointing the agent at the CLI; **map** adds three lines pointing it at the artifact.
Ten runs per cell; a cost cell is the mean over the working runs (❌ — none worked, shown over all ten), and an answer works when it names every required call, the host each goes to, the required body fields, and the auth.

Every run, every command it issued, and every verdict is in [the detailed version](./tree-agent-index-benchmark-detailed.md).
