# Where the index pays

An agent handed an API description has two ways to work: read and search the file, or ask `tree` for an index of it.
This measures both on the same tasks — eight of them, over six descriptions from 41 KB to 2,909 files — and judges the answer, not the effort: does the flow the agent produces actually run?

**156 of 240 runs produced a working flow: 67 of 120 without the index, 89 of 120 with it.**
The index rarely changes what a strong model can do. What it changes is whether a smaller one gets there at all, and what the answer costs to reach.

## What it changes

| Description      | Model     |     works |  no tree |     tree | Δ cost |
| ---------------- | --------- | --------: | -------: | -------: | -----: |
| GitHub REST      | Sonnet 5  | 5/5 → 5/5 |    $0.39 |    $0.33 |   −15% |
| GitHub REST      | Opus 5    | 5/5 → 5/5 |    $0.63 |    $0.60 |    −5% |
| GitHub REST      | Haiku 4.5 | 1/5 → 0/5 |    $0.12 | $0.07 ❌ |      — |
| Billing API      | Sonnet 5  | 0/5 → 4/5 | $0.76 ❌ |    $0.65 |      — |
| Billing API      | Opus 5    | 5/5 → 5/5 |    $1.97 |    $1.12 |   −43% |
| Billing API      | Haiku 4.5 | 0/5 → 2/5 | $0.18 ❌ |    $0.16 |      — |
| Stripe           | Sonnet 5  | 0/5 → 0/5 | $0.59 ❌ | $0.35 ❌ |   −41% |
| Stripe           | Opus 5    | 4/5 → 5/5 |    $1.40 |    $1.16 |   −17% |
| Stripe           | Haiku 4.5 | 0/5 → 0/5 | $0.17 ❌ | $0.12 ❌ |   −29% |
| Stripe Climate   | Sonnet 5  | 4/5 → 5/5 |    $0.33 |    $0.26 |   −21% |
| Stripe Climate   | Opus 5    | 5/5 → 5/5 |    $0.57 |    $0.47 |   −18% |
| Stripe Climate   | Haiku 4.5 | 0/5 → 5/5 | $0.10 ❌ |    $0.10 |      — |
| PayPal Orders    | Sonnet 5  | 5/5 → 5/5 |    $0.40 |    $0.38 |    −5% |
| PayPal Orders    | Opus 5    | 5/5 → 5/5 |    $0.71 |    $0.93 |   +31% |
| PayPal Orders    | Haiku 4.5 | 1/5 → 3/5 |    $0.11 |    $0.12 |    +9% |
| DigitalOcean     | Sonnet 5  | 0/5 → 4/5 | $0.41 ❌ |    $0.47 |      — |
| DigitalOcean     | Opus 5    | 5/5 → 5/5 |    $0.78 |    $0.78 |    −0% |
| DigitalOcean     | Haiku 4.5 | 1/5 → 1/5 |    $0.19 |    $0.18 |    −5% |
| DigitalOcean NFS | Sonnet 5  | 1/5 → 3/5 |    $0.53 |    $0.43 |   −19% |
| DigitalOcean NFS | Opus 5    | 5/5 → 5/5 |    $0.72 |    $0.77 |    +7% |
| DigitalOcean NFS | Haiku 4.5 | 0/5 → 4/5 | $0.23 ❌ |    $0.14 |      — |
| Cafe API         | Sonnet 5  | 5/5 → 5/5 |    $0.43 |    $0.38 |   −12% |
| Cafe API         | Opus 5    | 5/5 → 5/5 |    $0.65 |    $0.65 |    −0% |
| Cafe API         | Haiku 4.5 | 5/5 → 3/5 |    $0.07 |    $0.10 |   +43% |

Cost is the least reproducible number here — a warm prompt cache can halve it for identical work — so read it for shape.
Context moves the same way and more steadily; it is in each tab below, and per-run in [the detailed version](./tree-agent-index-benchmark-v3-detailed.md).

## The head-to-heads

{% tabs %}

{% tab label="GitHub REST" %}

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

| Model     |     works |     no tree |         tree | Δ context |
| --------- | --------: | ----------: | -----------: | --------: |
| Sonnet 5  | 5/5 → 5/5 | 12,492 / 12 |   11,336 / 9 |       −9% |
| Opus 5    | 5/5 → 5/5 | 16,870 / 11 |  14,681 / 11 |      −13% |
| Haiku 4.5 | 1/5 → 0/5 | 13,058 / 11 | 6,880 / 7 ❌ |         — |

What the failing runs left out:

- **Haiku 4.5 · no tree** — 1 run: no app token, no asset delete
- **Haiku 4.5 · no tree** — 3 runs: no app token
- **Haiku 4.5 · tree** — 5 runs: no app token

Sonnet 5 and Opus 5 answer correctly either way; the index buys 9% to 13% less context and fewer calls. Haiku 4.5 never mints the installation token its own flow declares.

{% /tab %}

{% tab label="Billing API" %}

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

| Model     |     works |        no tree |        tree | Δ context |
| --------- | --------: | -------------: | ----------: | --------: |
| Sonnet 5  | 0/5 → 4/5 | 12,532 / 16 ❌ | 23,098 / 20 |         — |
| Opus 5    | 5/5 → 5/5 |    44,355 / 39 | 35,346 / 20 |      −20% |
| Haiku 4.5 | 0/5 → 2/5 | 25,809 / 18 ❌ | 19,777 / 18 |         — |

What the failing runs left out:

- **Sonnet 5 · no tree** — 3 runs: no auth scheme
- **Sonnet 5 · no tree** — 1 run: no product call, no plan call, no auth scheme
- **Sonnet 5 · no tree** — 1 run: wrong auth header
- **Sonnet 5 · tree** — 1 run: no auth scheme
- **Haiku 4.5 · no tree** — 4 runs: no product call, no plan call, no auth scheme
- **Haiku 4.5 · no tree** — 1 run: no product call, no auth scheme
- **Haiku 4.5 · tree** — 3 runs: no product call

The index turns Sonnet 5 from nothing that runs into four flows in five, and halves what Opus 5 pays. Every control failure here is the same one: the secret key never reaches the request.

{% /tab %}

{% tab label="Stripe" %}

**Description:** 6.07 MB in one file.

**Task:** a paid tier with a 14-day free trial, billed monthly on the customer's saved card.
Expected: `POST /v1/products` → `POST /v1/prices` → `POST /v1/subscriptions`.

**The trap:** the legacy `/v1/plans` sits next to `/v1/prices`, and the trial rides on `trial_period_days`.

{% tabs %}
{% tab label="Prompt: no tree" %}

```text
We're launching a paid tier for our product: an existing customer should get a 14-day
free trial and then be billed monthly on their saved card, automatically. Work out what
our backend has to call to set that up, end to end.

API description: stripe.yaml

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% tab label="Prompt: tree" %}

```text
We're launching a paid tier for our product: an existing customer should get a 14-day
free trial and then be billed monthly on their saved card, automatically. Work out what
our backend has to call to set that up, end to end.

API description: stripe.yaml

The Redocly CLI is installed and its `tree` command can search the description for you.
Start with `redocly tree --help` to see what it can select, then work with `--format=ai`:
redocly tree stripe.yaml --format=ai <flags>

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% /tabs %}

| Model     |     works |        no tree |          tree | Δ context |
| --------- | --------: | -------------: | ------------: | --------: |
| Sonnet 5  | 0/5 → 0/5 | 18,215 / 16 ❌ | 18,908 / 7 ❌ |       +4% |
| Opus 5    | 4/5 → 5/5 |    24,339 / 25 |   33,751 / 17 |      +39% |
| Haiku 4.5 | 0/5 → 0/5 | 35,056 / 14 ❌ | 19,929 / 9 ❌ |      −43% |

What the failing runs left out:

- **Sonnet 5 · no tree** — 2 runs: no auth scheme
- **Sonnet 5 · no tree** — 3 runs: no product call, no price call, no auth scheme
- **Sonnet 5 · tree** — 1 run: no product call, no price call, no auth scheme
- **Sonnet 5 · tree** — 2 runs: no product call, no auth scheme
- **Sonnet 5 · tree** — 2 runs: no auth scheme
- **Opus 5 · no tree** — 1 run: no auth scheme
- **Haiku 4.5 · no tree** — 5 runs: no product call, no price call, no auth scheme
- **Haiku 4.5 · tree** — 1 run: no product call, no price call
- **Haiku 4.5 · tree** — 4 runs: no product call, no price call, no auth scheme

Only Opus 5 passes. Sonnet 5 and Haiku 4.5 start from "your price id" — a catalog the task says does not exist yet — and an index cannot fix a plan that begins from the wrong premise. The next tab is the same file without that pull.

{% /tab %}

{% tab label="Stripe Climate" %}

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

| Model     |     works |       no tree |       tree | Δ context |
| --------- | --------: | ------------: | ---------: | --------: |
| Sonnet 5  | 4/5 → 5/5 |    14,297 / 8 |  8,417 / 7 |      −41% |
| Opus 5    | 5/5 → 5/5 |    14,761 / 8 |  9,888 / 8 |      −33% |
| Haiku 4.5 | 0/5 → 5/5 | 14,305 / 8 ❌ | 9,823 / 12 |         — |

What the failing runs left out:

- **Sonnet 5 · no tree** — 1 run: no auth scheme
- **Haiku 4.5 · no tree** — 5 runs: no auth scheme

The same file, a corner no tutorial covers, and the picture inverts: every model finds the calls, and Haiku 4.5 goes from none of five to all five. Its control runs name the right calls and never say how they authenticate; with the index they quote the `security:` line back.

{% /tab %}

{% tab label="PayPal Orders" %}

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

| Model     |     works |     no tree |        tree | Δ context |
| --------- | --------: | ----------: | ----------: | --------: |
| Sonnet 5  | 5/5 → 5/5 |  9,857 / 12 | 17,435 / 10 |      +77% |
| Opus 5    | 5/5 → 5/5 | 18,038 / 11 | 21,656 / 20 |      +20% |
| Haiku 4.5 | 1/5 → 3/5 |  17,624 / 9 | 19,569 / 14 |      +11% |

What the failing runs left out:

- **Haiku 4.5 · no tree** — 1 run: no tracker call
- **Haiku 4.5 · no tree** — 1 run: no auth scheme
- **Haiku 4.5 · no tree** — 1 run: no intent field, no capture call
- **Haiku 4.5 · no tree** — 1 run: no tracker call, no auth scheme
- **Haiku 4.5 · tree** — 1 run: no intent field, no carrier field
- **Haiku 4.5 · tree** — 1 run: no intent field, no auth scheme

Everything passes for Sonnet 5 and Opus 5, and both pay more context — nine operations barely need finding. Haiku 4.5 gains the `capture_id` chain it kept missing.

{% /tab %}

{% tab label="DigitalOcean" %}

**Description:** 2.62 MB across 2,909 files.

**Task:** one server in its own private network, an extra storage volume attached, and a firewall that lets in only SSH and HTTPS.
Expected: `POST /v2/vpcs` → `POST /v2/droplets` → `POST /v2/volumes` → the volume attach action → `POST /v2/firewalls`.

**The trap:** the droplet joins the network by `vpc_uuid`, and the volume attach is a separate call.

{% tabs %}
{% tab label="Prompt: no tree" %}

```text
We're standing up a small web service: one server in its own private network, an extra
storage volume attached to it, and a firewall that lets in only SSH and HTTPS. Nothing
is set up yet. Work out what our deploy script has to call, in order.

API description: digitalocean/DigitalOcean-public.v2.yaml

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% tab label="Prompt: tree" %}

```text
We're standing up a small web service: one server in its own private network, an extra
storage volume attached to it, and a firewall that lets in only SSH and HTTPS. Nothing
is set up yet. Work out what our deploy script has to call, in order.

API description: digitalocean/DigitalOcean-public.v2.yaml

The Redocly CLI is installed and its `tree` command can search the description for you.
Start with `redocly tree --help` to see what it can select, then work with `--format=ai`:
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai <flags>

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% /tabs %}

| Model     |     works |        no tree |        tree | Δ context |
| --------- | --------: | -------------: | ----------: | --------: |
| Sonnet 5  | 0/5 → 4/5 | 17,177 / 13 ❌ | 20,377 / 16 |         — |
| Opus 5    | 5/5 → 5/5 |    23,324 / 14 | 26,045 / 19 |      +12% |
| Haiku 4.5 | 1/5 → 1/5 |    24,968 / 19 | 19,839 / 21 |      −21% |

What the failing runs left out:

- **Sonnet 5 · no tree** — 5 runs: no auth scheme
- **Sonnet 5 · tree** — 1 run: no auth scheme
- **Haiku 4.5 · no tree** — 3 runs: no auth scheme
- **Haiku 4.5 · no tree** — 1 run: no attach
- **Haiku 4.5 · tree** — 1 run: no vpc call, no droplet call, no volume call, no attach, no firewall call, no auth scheme
- **Haiku 4.5 · tree** — 3 runs: no auth scheme

Opus 5 passes either way and pays 33% more context: 2,909 single-operation files named by what they do already are an index, and reading one beats fetching a card. Sonnet 5 still moves from none to four, because the cards state the authentication its own answers kept omitting.

{% /tab %}

{% tab label="DigitalOcean NFS" %}

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

| Model     |     works |        no tree |        tree | Δ context |
| --------- | --------: | -------------: | ----------: | --------: |
| Sonnet 5  | 1/5 → 3/5 |    17,421 / 16 | 13,015 / 17 |      −25% |
| Opus 5    | 5/5 → 5/5 |     16,427 / 8 | 23,653 / 15 |      +44% |
| Haiku 4.5 | 0/5 → 4/5 | 40,843 / 15 ❌ | 12,941 / 18 |         — |

What the failing runs left out:

- **Sonnet 5 · no tree** — 1 run: no share call, no access point call, no auth scheme
- **Sonnet 5 · no tree** — 3 runs: no auth scheme
- **Sonnet 5 · tree** — 2 runs: no auth scheme
- **Haiku 4.5 · no tree** — 3 runs: no auth scheme
- **Haiku 4.5 · no tree** — 1 run: no access point call, no auth scheme
- **Haiku 4.5 · no tree** — 1 run: no access point call
- **Haiku 4.5 · tree** — 1 run: no auth scheme

The same 2,909 files, a corner the tutorials skip: Haiku 4.5 moves from none of five to four. The second of two controls in this grid for what a model remembers versus what it reads.

{% /tab %}

{% tab label="Cafe API" %}

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

| Model     |     works |    no tree |        tree | Δ context |
| --------- | --------: | ---------: | ----------: | --------: |
| Sonnet 5  | 5/5 → 5/5 | 16,935 / 1 | 10,849 / 10 |      −36% |
| Opus 5    | 5/5 → 5/5 | 16,769 / 1 | 15,375 / 11 |       −8% |
| Haiku 4.5 | 5/5 → 3/5 | 15,764 / 1 |  8,773 / 13 |      −44% |

What the failing runs left out:

- **Haiku 4.5 · tree** — 2 runs: no token call

At 41 KB the whole description fits in one read, and the index still cuts context by a third for Sonnet 5. Haiku 4.5 loses the token call among the cards twice.

{% /tab %}

{% /tabs %}

## What this says

Four cells move from at most one working flow to three or more once the index is there: Sonnet 5 on the billing API and on DigitalOcean, Haiku 4.5 on Stripe Climate and on DigitalOcean NFS.
In every one of them the control runs name the right calls and never say how the request authenticates — the single largest failure class in the grid, and the one an index removes by stating the requirement on the card.

It does not pay everywhere. On DigitalOcean, a description already split into 2,909 single-operation files named by what they do, reading a file beats fetching a card, and the index costs a third more context.
On Stripe it cannot rescue a plan that starts from a price the task never created — the same file asked about carbon removal, where no tutorial supplies an answer, passes everywhere.

## How this was measured

Every run is a fresh Claude Code session with the task text as its only input, allowed to run shell commands, read files and search them, starting in a directory holding nothing but the description.
The **no tree** prompt names neither `tree` nor Redocly; the **tree** prompt adds two lines saying the CLI is installed and that `redocly tree --help` lists what it can select.
Each cell is five runs; the tables give the median over the ones whose flow works, and a cell marked ❌ is one where none did.
An answer works when it names every required call, the host each goes to, the fields the body needs, and how the request authenticates.

Every run, every command it issued, and every verdict is in [the detailed version](./tree-agent-index-benchmark-v3-detailed.md).
