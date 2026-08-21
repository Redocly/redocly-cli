# What the `tree` index costs an agent, measured

{% admonition type="warning" name="Superseded" %}
This benchmark measured `@redocly/cli@0.0.0-snapshot.1786868116`. `tree --format=ai` has changed since — long prose is clipped, error responses fold to their codes, and every card states the security requirement that applies to it — so the numbers here no longer reproduce.

Read [Whether the flow an agent produces would actually run](./tree-agent-index-benchmark-v2.md) instead: it measures the current output over four models and three repeats a cell, and checks that the answer would work rather than only that it names the right calls.
{% /admonition %}

Same multi-step task, fresh isolated sessions per description and model (Claude Sonnet 5, Opus, Fable 5; English prompts):

- **no tree** — the task and the path to the file, nothing else. Neither `tree` nor Redocly is named, so the agent has no hint the command exists and works the file with general-purpose tools.
- **tree** — the same task plus the run line (`npx -y @redocly/cli@<snapshot> tree <file> --format=ai`), and one sentence: every view ends with a `next:` line naming the flags that continue from it, follow those.

Both prompts are printed in full under each description below.
Neither lists the flags, and the tree prompt links no documentation: the agent learns the surface from the output itself.
That is deliberate on both counts — this command's reference page is 87 KB, about 20,000 tokens, and an agent offered it reads it, which costs more than the exploration it saves; and the run line carries `--format=ai`, because the stylish views are built for a terminal and end with no `next:` line, so an agent given those falls back to guessing flags and reading the file.

Each run is measured by the context it added to its own session — how much of the description the agent had to pull into the window — with tool calls after the slash, and by what it was billed.
How both are counted is in [How this was measured](#how-this-was-measured) at the end.

Descriptions: GitHub REST (`api.github.com.yaml` from [`github/rest-api-description`](https://github.com/github/rest-api-description), 10.0 MB — far beyond any context window),
a billing API (Rebilly, 1.3 MB), the Cafe demo API (41 KB).

## The head-to-heads

{% tabs %}
{% tab label="GitHub REST · 10.0 MB" %}

**Task:** publish a release, upload a zip asset to it, delete the asset — hosts, required fields, what feeds each next request.
Trap: the upload operation overrides its server to `https://uploads.github.com` at the operation level.

{% tabs %}
{% tab label="Prompt: no tree" %}

```text
Task: in a large OpenAPI description of a REST API, work out how to publish a release in a repository, upload a zip asset to it, and then delete that asset.

List the requests in order: method, path, the exact HOST (base URL) of each request, required fields with types, success status codes, and which field from each response feeds the next request.

Description: github-api.yaml
```

{% /tab %}
{% tab label="Prompt: tree" %}

```text
Task: in a large OpenAPI description of a REST API, work out how to publish a release in a repository, upload a zip asset to it, and then delete that asset.

List the requests in order: method, path, the exact HOST (base URL) of each request, required fields with types, success status codes, and which field from each response feeds the next request.

The Redocly CLI's `tree` command is available and is meant for exactly this — walking a description in bounded steps instead of reading or grepping it. Run it as:

npx -y @redocly/cli@<snapshot> tree github-api.yaml --format=ai <flags>

Run it with no extra flags first for the overview. Every view ends with a `next:` line naming the flags that continue from it — follow those. There is no documentation to read for this run.
```

{% /tab %}
{% /tabs %}

| Model    |     no tree |      tree | Difference |
| -------- | ----------: | --------: | ---------: |
| Sonnet 5 | 10,523 / 11 | 9,459 / 6 |       −10% |
| Opus 5   |  9,024 / 10 | 9,298 / 7 |        +3% |
| Fable 5  |   8,762 / 7 | 7,226 / 5 |       −18% |

What the tree agent ran:

{% tabs %}
{% tab label="Sonnet 5" %}

```bash
npx -y @redocly/cli tree github-api.yaml --format=ai
npx -y @redocly/cli tree github-api.yaml --format=ai --find=release
npx -y @redocly/cli tree github-api.yaml --format=ai --find=upload
npx -y @redocly/cli tree github-api.yaml --format=ai --path=/repos/{owner}/{repo}/releases --operation=post --with-deps
npx -y @redocly/cli tree github-api.yaml --format=ai --path=/repos/{owner}/{repo}/releases/{release_id}/assets --operation=post --with-deps
npx -y @redocly/cli tree github-api.yaml --format=ai --path=/repos/{owner}/{repo}/releases/assets/{asset_id} --operation=delete --with-deps
```

{% /tab %}
{% tab label="Opus 5" %}

```bash
npx -y @redocly/cli tree github-api.yaml --format=ai
npx -y @redocly/cli tree github-api.yaml --format=ai --find=release
npx -y @redocly/cli tree github-api.yaml --format=ai --path='/repos/{owner}/{repo}/releases' --operation=post --with-deps
npx -y @redocly/cli tree github-api.yaml --format=ai --find='upload release asset'
npx -y @redocly/cli tree github-api.yaml --format=ai --find='upload asset'
npx -y @redocly/cli tree github-api.yaml --format=ai --path='/repos/{owner}/{repo}/releases/{release_id}/assets' --operation=post
npx -y @redocly/cli tree github-api.yaml --format=ai --path='/repos/{owner}/{repo}/releases/assets/{asset_id}' --operation=delete --with-deps
npx -y @redocly/cli tree github-api.yaml --format=ai --component=parameters --name=asset-id
npx -y @redocly/cli tree github-api.yaml --format=ai --component=parameters --name=release-id
```

7 tool calls, 9 invocations: this model bundled several commands into one shell call.

{% /tab %}
{% tab label="Fable 5" %}

```bash
npx -y @redocly/cli tree github-api.yaml --format=ai
npx -y @redocly/cli tree github-api.yaml --format=ai --find="release asset"
npx -y @redocly/cli tree github-api.yaml --format=ai --path=/repos/{owner}/{repo}/releases --operation=post --with-deps
npx -y @redocly/cli tree github-api.yaml --format=ai --path=/repos/{owner}/{repo}/releases/{release_id}/assets --operation=post --with-deps
npx -y @redocly/cli tree github-api.yaml --format=ai --path=/repos/{owner}/{repo}/releases/assets/{asset_id} --operation=delete --with-deps
```

{% /tab %}
{% /tabs %}

Both agents correct, including the host override.
No tag listing was needed: `--find` narrowed 1,000+ operations to a handful in one call, and every model started there.
Sonnet 5 shows the widest gap in actions: 11 `grep`/`sed` calls against 6 bounded ones.
Opus 5 is the one cell in the grid where the index does not pay off — a first `grep` that lands well returns as little as a card does.

{% /tab %}
{% tab label="Billing API · 1.3 MB" %}

**Task:** create a product, a recurring-billing plan for it, then subscribe an existing customer.
Traps: `Plan` is an `anyOf` without a discriminator (the recurring variant is `SubscriptionPlan`), and the subscription lives under the `Orders` tag.

{% tabs %}
{% tab label="Prompt: no tree" %}

```text
Task: in the OpenAPI description of a billing API, work out how to set up a recurring subscription for an existing customer from scratch — create a product, create a plan with recurring pricing for it, and then create the subscription itself.

List the requests in order: method, path, HOST (base URL), required fields with types, success status codes, and which field from each step's response feeds the next request.

Description: rebilly.yaml
```

{% /tab %}
{% tab label="Prompt: tree" %}

```text
Task: in the OpenAPI description of a billing API, work out how to set up a recurring subscription for an existing customer from scratch — create a product, create a plan with recurring pricing for it, and then create the subscription itself.

List the requests in order: method, path, HOST (base URL), required fields with types, success status codes, and which field from each step's response feeds the next request.

The Redocly CLI's `tree` command is available and is meant for exactly this — walking a description in bounded steps instead of reading or grepping it. Run it as:

npx -y @redocly/cli@<snapshot> tree rebilly.yaml --format=ai <flags>

Run it with no extra flags first for the overview. Every view ends with a `next:` line naming the flags that continue from it — follow those. There is no documentation to read for this run.
```

{% /tab %}
{% /tabs %}

| Model    |     no tree |        tree | Difference |
| -------- | ----------: | ----------: | ---------: |
| Sonnet 5 | 20,705 / 26 | 20,457 / 13 |        −1% |
| Opus 5   | 19,435 / 17 | 18,512 / 10 |        −5% |
| Fable 5  | 18,476 / 22 | 15,304 / 12 |       −17% |

What the tree agent ran:

{% tabs %}
{% tab label="Sonnet 5" %}

```bash
npx -y @redocly/cli tree rebilly.yaml --format=ai
npx -y @redocly/cli tree rebilly.yaml --format=ai --tag=Products
npx -y @redocly/cli tree rebilly.yaml --format=ai --tag=Plans
npx -y @redocly/cli tree rebilly.yaml --format=ai --find=subscription
npx -y @redocly/cli tree rebilly.yaml --format=ai --path=/products --operation=post --with-deps
npx -y @redocly/cli tree rebilly.yaml --format=ai --path=/plans --operation=post --with-deps
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionPlan
npx -y @redocly/cli tree rebilly.yaml --format=ai --path=/subscriptions --operation=post --with-deps
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=requestBodies --name=Subscription
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=Subscription
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=OriginalPlan
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=requestBodies --name=Product
```

{% /tab %}
{% tab label="Opus 5" %}

```bash
npx -y @redocly/cli tree rebilly.yaml --format=ai
npx -y @redocly/cli tree specs/rebilly.yaml --format=ai --tag=$t
npx -y @redocly/cli tree specs/rebilly.yaml --format=ai --tag=Orders
npx -y @redocly/cli tree specs/rebilly.yaml --format=ai --path=/products --operation=post --with-deps
npx -y @redocly/cli tree specs/rebilly.yaml --format=ai --component=schemas --name=Product
npx -y @redocly/cli tree specs/rebilly.yaml --format=ai --path=/plans --operation=post --with-deps
npx -y @redocly/cli tree specs/rebilly.yaml --format=ai --component=schemas --name=SubscriptionPlan
npx -y @redocly/cli tree specs/rebilly.yaml --format=ai --component=schemas --name=PlanPriceFormula --with-deps
npx -y @redocly/cli tree specs/rebilly.yaml --format=ai --path=/subscriptions --operation=post --with-deps
npx -y @redocly/cli tree specs/rebilly.yaml --format=ai --component=requestBodies --name=Subscription
npx -y @redocly/cli tree specs/rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem --with-deps
npx -y @redocly/cli tree specs/rebilly.yaml --format=ai --pointer='#/components/schemas/Subscription'
npx -y @redocly/cli tree specs/rebilly.yaml --format=ai --component=schemas --name=release-id
```

10 tool calls, 13 invocations: this model bundled several commands into one shell call.

{% /tab %}
{% tab label="Fable 5" %}

```bash
npx -y @redocly/cli tree rebilly.yaml --format=ai
npx -y @redocly/cli tree rebilly.yaml --format=ai --tag=Products
npx -y @redocly/cli tree rebilly.yaml --format=ai --tag=Plans
npx -y @redocly/cli tree rebilly.yaml --format=ai --find=subscription
npx -y @redocly/cli tree rebilly.yaml --format=ai --path=/products --operation=post --with-deps
npx -y @redocly/cli tree rebilly.yaml --format=ai --path=/plans --operation=post --with-deps
npx -y @redocly/cli tree rebilly.yaml --format=ai --path=/subscriptions --operation=post --with-deps
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionPlan
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=PlanPriceFormula
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=OriginalPlan
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=PlanFormulaFixedFee
```

{% /tab %}
{% /tabs %}

Both agents correct, including the `anyOf` plan choice and the `Orders` tag.
This is the description where the index is worked hardest — a subscription pulls in a dozen schemas — and where the context saving is smallest: 1–17%. The work still halves in actions — 13 bounded calls against 26 searches on Sonnet 5 — but a closure of a dozen schemas has to enter the window either way.

{% /tab %}
{% tab label="Cafe API · 41 KB" %}

**Task:** find a coffee item on the menu, create an order for it, then check that order's status — including where the OAuth2 token comes from.

{% tabs %}
{% tab label="Prompt: no tree" %}

```text
Task: in the OpenAPI description of a cafe, work out how to find a coffee item on the menu, create an order for it, and then check that order's status.

List the requests in order: method, path, HOST (base URL), required fields with types, authorization (if needed — where the token comes from), success status codes, and which field from each response feeds the next request.

Description: cafe.yaml
```

{% /tab %}
{% tab label="Prompt: tree" %}

```text
Task: in the OpenAPI description of a cafe, work out how to find a coffee item on the menu, create an order for it, and then check that order's status.

List the requests in order: method, path, HOST (base URL), required fields with types, authorization (if needed — where the token comes from), success status codes, and which field from each response feeds the next request.

The Redocly CLI's `tree` command is available and is meant for exactly this — walking a description in bounded steps instead of reading or grepping it. Run it as:

npx -y @redocly/cli@<snapshot> tree cafe.yaml --format=ai <flags>

Run it with no extra flags first for the overview. Every view ends with a `next:` line naming the flags that continue from it — follow those. There is no documentation to read for this run.
```

{% /tab %}
{% /tabs %}

| Model    |    no tree |      tree | Difference |
| -------- | ---------: | --------: | ---------: |
| Sonnet 5 | 16,866 / 1 | 8,095 / 8 |       −52% |
| Opus 5   | 16,916 / 2 | 9,375 / 4 |       −45% |
| Fable 5  | 16,840 / 1 | 8,181 / 7 |       −51% |

What the tree agent ran:

{% tabs %}
{% tab label="Sonnet 5" %}

```bash
npx -y @redocly/cli tree cafe.yaml --format=ai
npx -y @redocly/cli tree cafe.yaml --format=ai --path=/menu --operation=get --with-deps
npx -y @redocly/cli tree cafe.yaml --format=ai --path=/orders --operation=post --with-deps
npx -y @redocly/cli tree cafe.yaml --format=ai --path=/orders/{orderId} --operation=get --with-deps
npx -y @redocly/cli tree cafe.yaml --format=ai --component=securitySchemes
npx -y @redocly/cli tree cafe.yaml --format=ai --component=schemas --name=Order --with-deps
npx -y @redocly/cli tree cafe.yaml --format=ai --component=schemas --name=Beverage --with-deps
npx -y @redocly/cli tree cafe.yaml --format=ai --component=securitySchemes --name=OAuth2
```

{% /tab %}
{% tab label="Opus 5" %}

```bash
npx -y @redocly/cli tree cafe.yaml --format=ai
npx -y @redocly/cli tree specs/cafe.yaml --format=ai --path=/menu --operation=get --with-deps
npx -y @redocly/cli tree specs/cafe.yaml --format=ai --path=/orders --operation=post --with-deps
npx -y @redocly/cli tree specs/cafe.yaml --format=ai --component=schemas --name=$c
npx -y @redocly/cli tree specs/cafe.yaml --format=ai --path='/orders/{orderId}' --operation=get --with-deps
npx -y @redocly/cli tree specs/cafe.yaml --format=ai --component=securitySchemes
npx -y @redocly/cli tree specs/cafe.yaml --format=ai --component=securitySchemes --name=OAuth2
npx -y @redocly/cli tree specs/cafe.yaml --format=ai --path=/oauth2/register --operation=post --with-deps
npx -y @redocly/cli tree specs/cafe.yaml --format=ai --component=schemas --name=MenuBaseItem
npx -y @redocly/cli tree specs/cafe.yaml --format=ai --component=parameters --name=OrderId
```

4 tool calls, 10 invocations: this model bundled several commands into one shell call.

{% /tab %}
{% tab label="Fable 5" %}

```bash
npx -y @redocly/cli tree cafe.yaml --format=ai
npx -y @redocly/cli tree cafe.yaml --format=ai --path=/menu --operation=get --with-deps
npx -y @redocly/cli tree cafe.yaml --format=ai --path=/orders --operation=post --with-deps
npx -y @redocly/cli tree cafe.yaml --format=ai --path='/orders/{orderId}' --operation=get --with-deps
npx -y @redocly/cli tree cafe.yaml --format=ai --component=securitySchemes --name=OAuth2
npx -y @redocly/cli tree cafe.yaml --format=ai --path=/oauth2/register --operation=post --with-deps
npx -y @redocly/cli tree cafe.yaml --format=ai --component=schemas --name=Order
```

{% /tab %}
{% /tabs %}

On a file this small the no-tree agent simply reads it whole — one action.
That read is the whole cost: ~16,850 tokens of context on every model, against 7,400–9,400 through cards. Halving the context is the most consistent result in the grid. It is also the steadiest: three models, three runs, the same halving each time.

{% /tab %}
{% /tabs %}

## The grid in one view

| Description | Model    |     no tree |        tree | Difference |
| ----------- | -------- | ----------: | ----------: | ---------: |
| GitHub REST | Sonnet 5 | 10,523 / 11 |   9,459 / 6 |       −10% |
| GitHub REST | Opus 5   |  9,024 / 10 |   9,298 / 7 |        +3% |
| GitHub REST | Fable 5  |   8,762 / 7 |   7,226 / 5 |       −18% |
| Billing API | Sonnet 5 | 20,705 / 26 | 20,457 / 13 |        −1% |
| Billing API | Opus 5   | 19,435 / 17 | 18,512 / 10 |        −5% |
| Billing API | Fable 5  | 18,476 / 22 | 15,304 / 12 |       −17% |
| Cafe API    | Sonnet 5 |  16,866 / 1 |   8,095 / 8 |       −52% |
| Cafe API    | Opus 5   |  16,916 / 2 |   9,375 / 4 |       −45% |
| Cafe API    | Fable 5  |  16,840 / 1 |   8,181 / 7 |       −51% |

The size of the win tracks how much of the description the other agent has to pull in: half of it on the 41 KB Cafe API, which it reads whole, and 1–18% on the two large ones, which it can search instead.
Tool calls halve in almost every cell — 13 against 26, 10 against 17, 6 against 11 — which is where the saving comes from on the large descriptions, since a closure of a dozen schemas has to enter the window either way.

What the same runs were billed:

| Description | Model    | no tree |   tree | Difference |
| ----------- | -------- | ------: | -----: | ---------: |
| GitHub REST | Sonnet 5 |  $0.338 | $0.253 |       −25% |
| GitHub REST | Opus 5   |  $0.372 | $0.390 |        +5% |
| GitHub REST | Fable 5  |  $0.703 | $0.586 |       −17% |
| Billing API | Sonnet 5 |  $0.873 | $0.379 |       −57% |
| Billing API | Opus 5   |  $0.720 | $0.592 |       −18% |
| Billing API | Fable 5  |  $1.665 | $0.964 |       −42% |
| Cafe API    | Sonnet 5 |  $0.219 | $0.224 |        +2% |
| Cafe API    | Opus 5   |  $0.348 | $0.337 |        −3% |
| Cafe API    | Fable 5  |  $0.635 | $0.610 |        −4% |

Read this table for its shape, not its precision: it is the same tokens seen from the billing side, where a cached read costs about a tenth of fresh input, so it rewards fewer turns as much as smaller ones.
That is why the billing API saves most here and least on context — 26 searches against 13 bounded calls — and why the Cafe API is the other way round.
Amounts compare across a row only: the same billing-API task costs $0.72 on Opus 5 and $1.67 on Fable 5, which says nothing about the index.

## How this was measured

Every run is a fresh Claude Code session started from the command line with the task text as its only input, allowed to run shell commands, read files and search them.
Sessions start in an empty directory with the description outside any repository, so no `AGENTS.md` or `CLAUDE.md` reaches the model; the tree runs call `@redocly/cli@0.0.0-snapshot.1786868116` through `npx`.
Each cell is one run, and all 18 answers were checked and correct on both sides.

The numbers on this page belong to that build. `--format=ai` has since been made to carry less — long prose is clipped, error responses fold to their codes, and every card states the security requirement that applies to it — so a run repeated today pulls in less than the tables here show.
[Whether the flow an agent produces would actually run](./tree-agent-index-benchmark-v2.md) measures the current output, over four models and three repeats a cell, and checks that the answer would work rather than only that it names the right calls.

**context** — from the run's transcript, `~/.claude/projects/<directory>/<session_id>.jsonl`, over the `assistant` records that carry a `message.usage`.
A turn's context is `input_tokens + cache_read_input_tokens + cache_creation_input_tokens`, which is the whole prompt the model was handed on that turn; the table gives the last turn's minus the first turn's.
The first turn is the system prompt plus the task, so the subtraction drops 26,000 to 43,000 tokens that are identical in both conditions and drift between batches.

**actions** — `tool_use` blocks in those same records. One shell call can chain several commands with `;`, so a run's command list is sometimes longer.

**cost** — `total_cost_usd` as the run itself reports it, not recomputed here.
It is the least reproducible number on this page: the same no-tree task on the Cafe API cost $0.390 and then $0.219 for identical work, because the second run met a warm prompt cache and paid for reads instead of writes. In a series, whichever condition runs second gets that discount.

**Not used: the run's token totals.**
The summed `usage` a run reports counts the context once per turn, so it grows with the number of turns rather than the material pulled in — on the Cafe API it makes the index look 63–79% worse.

**Noise.** Repeating a cell through the index lands within a few percent, without it by up to 83%, because the agent invents a fresh search strategy every time; where a cell was run twice, the table shows the sample less favourable to `tree`.
A no-tree run that finishes in two calls on a large description has usually handed the task to a sub-agent, whose context is not reported; those are discarded and repeated.
Treat anything under about 15% as a tie.
