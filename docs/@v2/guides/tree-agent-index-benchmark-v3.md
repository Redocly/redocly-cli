# Where the index pays

An agent handed an API description has two ways to work: read and search the file, or ask `tree` for an index of it.
This measures both on the same tasks — six of them, over six descriptions from 41 KB to 2,909 files — and judges the answer, not the effort: does the flow the agent produces actually run?

**260 of 360 runs produced a working flow: 120 of 180 without the index, 140 of 180 with it.**
The index rarely changes what a strong model can do. What it changes is whether a smaller one gets there at all, and what the answer costs to reach.

## What it changes

| Description   | Task                 | Model     |         works |  no tree |  tree | Δ cost |
| ------------- | -------------------- | --------- | ------------: | -------: | ----: | -----: |
| GitHub REST   | publish a release    | Sonnet 5  | 10/10 → 10/10 |    $0.42 | $0.32 |   −24% |
| GitHub REST   | publish a release    | Opus 5    | 10/10 → 10/10 |    $0.82 | $0.64 |   −22% |
| GitHub REST   | publish a release    | Haiku 4.5 |   3/10 → 3/10 |    $0.10 | $0.10 |    −0% |
| Billing API   | start a subscription | Sonnet 5  |   2/10 → 6/10 |    $1.06 | $0.60 |   −43% |
| Billing API   | start a subscription | Opus 5    | 10/10 → 10/10 |    $1.85 | $1.11 |   −40% |
| Billing API   | start a subscription | Haiku 4.5 |   0/10 → 1/10 | $0.19 ❌ | $0.17 |      — |
| Stripe        | buy carbon removal   | Sonnet 5  |  9/10 → 10/10 |    $0.32 | $0.25 |   −22% |
| Stripe        | buy carbon removal   | Opus 5    | 10/10 → 10/10 |    $0.54 | $0.45 |   −17% |
| Stripe        | buy carbon removal   | Haiku 4.5 |   0/10 → 8/10 | $0.09 ❌ | $0.10 |      — |
| PayPal Orders | capture and track    | Sonnet 5  |  9/10 → 10/10 |    $0.40 | $0.41 |    +2% |
| PayPal Orders | capture and track    | Opus 5    | 10/10 → 10/10 |    $0.77 | $0.97 |   +26% |
| PayPal Orders | capture and track    | Haiku 4.5 |   4/10 → 4/10 |    $0.13 | $0.11 |   −15% |
| DigitalOcean  | shared file storage  | Sonnet 5  |   3/10 → 9/10 |    $0.34 | $0.36 |    +6% |
| DigitalOcean  | shared file storage  | Opus 5    | 10/10 → 10/10 |    $0.56 | $0.78 |   +39% |
| DigitalOcean  | shared file storage  | Haiku 4.5 |   4/10 → 4/10 |    $0.20 | $0.14 |   −30% |
| Cafe API      | order a coffee       | Sonnet 5  |  10/10 → 9/10 |    $0.24 | $0.28 |   +17% |
| Cafe API      | order a coffee       | Opus 5    | 10/10 → 10/10 |    $0.44 | $0.67 |   +52% |
| Cafe API      | order a coffee       | Haiku 4.5 |   6/10 → 6/10 |    $0.07 | $0.10 |   +43% |

Cost is the least reproducible number here — a warm prompt cache can halve it for identical work — so read it for shape.
Context moves the same way and more steadily; it is in each tab below, and per-run in [the detailed version](./tree-agent-index-benchmark-v3-detailed.md).

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
{% /tabs %}

| Model     |         works |     no tree |        tree | Δ context |
| --------- | ------------: | ----------: | ----------: | --------: |
| Sonnet 5  | 10/10 → 10/10 | 12,614 / 10 |  11,304 / 9 |      −10% |
| Opus 5    | 10/10 → 10/10 | 20,266 / 17 | 14,435 / 11 |      −29% |
| Haiku 4.5 |   3/10 → 3/10 | 11,060 / 10 | 10,262 / 10 |       −7% |

What the failing runs left out:

- **Haiku 4.5 · no tree** — 5 runs: no app token
- **Haiku 4.5 · no tree** — 1 run: no asset upload
- **Haiku 4.5 · no tree** — 1 run: no app token, no asset upload
- **Haiku 4.5 · tree** — 2 runs: no app token, no asset upload
- **Haiku 4.5 · tree** — 5 runs: no app token

Sonnet 5 and Opus 5 answer correctly either way; the index buys 9% to 13% less context and fewer calls. Haiku 4.5 never mints the installation token its own flow declares.

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
{% /tabs %}

| Model     |         works |        no tree |        tree | Δ context |
| --------- | ------------: | -------------: | ----------: | --------: |
| Sonnet 5  |   2/10 → 6/10 |    18,538 / 19 | 25,739 / 18 |      +39% |
| Opus 5    | 10/10 → 10/10 |    46,231 / 36 | 36,880 / 22 |      −20% |
| Haiku 4.5 |   0/10 → 1/10 | 31,613 / 16 ❌ | 20,710 / 19 |         — |

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
{% /tabs %}

| Model     |         works |       no tree |        tree | Δ context |
| --------- | ------------: | ------------: | ----------: | --------: |
| Sonnet 5  |  9/10 → 10/10 |    14,065 / 7 |   7,732 / 6 |      −45% |
| Opus 5    | 10/10 → 10/10 |    14,913 / 7 |   9,622 / 7 |      −35% |
| Haiku 4.5 |   0/10 → 8/10 | 12,952 / 7 ❌ | 10,202 / 12 |         — |

What the failing runs left out:

- **Sonnet 5 · no tree** — 1 run: no auth scheme
- **Haiku 4.5 · no tree** — 10 runs: no auth scheme
- **Haiku 4.5 · tree** — 2 runs: no auth scheme

The same file, a corner no tutorial covers, and the picture inverts: every model finds the calls, and Haiku 4.5 goes from none of five to all five. Its control runs name the right calls and never say how they authenticate; with the index they quote the `security:` line back.

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
{% /tabs %}

| Model     |         works |     no tree |        tree | Δ context |
| --------- | ------------: | ----------: | ----------: | --------: |
| Sonnet 5  |  9/10 → 10/10 | 17,351 / 10 |  23,572 / 8 |      +36% |
| Opus 5    | 10/10 → 10/10 | 19,024 / 13 | 27,908 / 16 |      +47% |
| Haiku 4.5 |   4/10 → 4/10 | 21,759 / 10 |  23,054 / 8 |       +6% |

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

Everything passes for Sonnet 5 and Opus 5, and both pay more context — nine operations barely need finding. Haiku 4.5 gains the `capture_id` chain it kept missing.

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
{% /tabs %}

| Model     |         works |     no tree |        tree | Δ context |
| --------- | ------------: | ----------: | ----------: | --------: |
| Sonnet 5  |   3/10 → 9/10 | 11,729 / 19 | 12,282 / 13 |       +5% |
| Opus 5    | 10/10 → 10/10 |  17,143 / 9 | 25,474 / 14 |      +49% |
| Haiku 4.5 |   4/10 → 4/10 | 37,888 / 14 | 13,508 / 13 |      −64% |

What the failing runs left out:

- **Sonnet 5 · no tree** — 7 runs: no auth scheme
- **Sonnet 5 · tree** — 1 run: no auth scheme
- **Haiku 4.5 · no tree** — 1 run: no vpc_ids field, no auth scheme
- **Haiku 4.5 · no tree** — 1 run: no auth scheme
- **Haiku 4.5 · no tree** — 4 runs: no access point call, no auth scheme
- **Haiku 4.5 · tree** — 4 runs: no auth scheme
- **Haiku 4.5 · tree** — 1 run: no share call, no access point call
- **Haiku 4.5 · tree** — 1 run: no share call, no access point call, no auth scheme

The same 2,909 files, a corner the tutorials skip: Haiku 4.5 moves from none of five to four. The second of two controls in this grid for what a model remembers versus what it reads.

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
{% /tabs %}

| Model     |         works |    no tree |        tree | Δ context |
| --------- | ------------: | ---------: | ----------: | --------: |
| Sonnet 5  |  10/10 → 9/10 | 16,912 / 1 |  8,840 / 10 |      −48% |
| Opus 5    | 10/10 → 10/10 | 16,926 / 2 | 15,417 / 13 |       −9% |
| Haiku 4.5 |   6/10 → 6/10 | 14,373 / 1 |  19,100 / 7 |      +33% |

What the failing runs left out:

- **Sonnet 5 · tree** — 1 run: no token call
- **Haiku 4.5 · no tree** — 4 runs: no token call
- **Haiku 4.5 · tree** — 4 runs: no token call

At 41 KB the whole description fits in one read, and the index still cuts context by a third for Sonnet 5. Haiku 4.5 loses the token call among the cards twice.

{% /tab %}

{% /tabs %}

## What the numbers show

**An index decides whether a smaller model gets there at all.**
Three cells move from at most three working flows in ten to six or more once it is available: Sonnet 5 on the billing API and on shared file storage, Haiku 4.5 on carbon removal, which goes from none of ten to eight.
Opus 5, meanwhile, passes all 120 of its runs either way — it does not need one.

**Almost every one of those failures is the same failure.** The control runs name the right calls in the right order and never say how the request authenticates: no key, no header, no token. It is the largest failure class in the grid by a wide margin, and it is what an index removes, because every card states the requirement that protects the operation.

**It does not pay everywhere, and the grid shows where.** Where a description is small, or already laid out as one file per operation, fetching cards costs more than reading it: Opus 5 pays 49% more context on DigitalOcean and 47% more on PayPal for answers it would have reached anyway.
The pattern across all six: the index earns its place on descriptions large enough that search is the only way in, and on models that would otherwise leave something out.

## How this was measured

Every run is a fresh Claude Code session with the task text as its only input, allowed to run shell commands, read files and search them, starting in a directory holding nothing but the description.
The **no tree** prompt names neither `tree` nor Redocly; the **tree** prompt adds two lines saying the CLI is installed and that `redocly tree --help` lists what it can select.
Each cell is ten runs; the tables give the median over the ones whose flow works, and a cell marked ❌ is one where none did.
An answer works when it names every required call, the host each goes to, the fields the body needs, and how the request authenticates.

Every run, every command it issued, and every verdict is in [the detailed version](./tree-agent-index-benchmark-v3-detailed.md).
