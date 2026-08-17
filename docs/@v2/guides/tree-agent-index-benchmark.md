# What the `tree` index costs an agent, measured

Same multi-step task, fresh isolated sessions per description and model (Claude Sonnet 5, Opus, Fable 5; English prompts):

- **no tree** — the task and the path to the file, nothing else. Neither `tree` nor Redocly is named, so the agent has no hint the command exists and works the file with general-purpose tools.
- **tree** — the same task plus the run line (`npx -y @redocly/cli@<snapshot> tree <file> --format=ai`), and one sentence: every view ends with a `next:` line naming the flags that continue from it, follow those.

Both prompts are printed in full under each description below.
Neither lists the flags, and the tree prompt links no documentation: the agent learns the surface from the output itself.
That is deliberate on both counts — this command's reference page is 87 KB, about 20,000 tokens, and an agent offered it reads it, which costs more than the exploration it saves; and the run line carries `--format=ai`, because the stylish views are built for a terminal and end with no `next:` line, so an agent given those falls back to guessing flags and reading the file.

Two numbers per run, both taken from the run itself:

| Metric      | What it counts                                                                                       |
| ----------- | ---------------------------------------------------------------------------------------------------- |
| **context** | tokens the run added to its own session — how much of the description it had to pull into the window |
| **cost**    | what the run was billed, in dollars, as reported by the CLI                                          |

Tables also give the number of tool calls after the slash.
Both come from the same run, so a row can be read across; how each is computed is in [How this was measured](#how-this-was-measured) at the end.
Costs compare inside a row only — a model's price list has nothing to do with the index.

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

| Model    |     no tree |      tree | Context | Cost |
| -------- | ----------: | --------: | ------: | ---: |
| Sonnet 5 | 10,523 / 11 | 9,459 / 6 |    −10% | −25% |
| Opus     |  9,024 / 10 | 9,298 / 7 |     +3% |  +5% |
| Fable 5  |   8,762 / 7 | 7,226 / 5 |    −18% | −17% |

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
{% tab label="Opus" %}

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
Opus is the one cell in the grid where the index does not pay off — a first `grep` that lands well returns as little as a card does.

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

| Model    |     no tree |        tree | Context | Cost |
| -------- | ----------: | ----------: | ------: | ---: |
| Sonnet 5 | 24,814 / 31 | 22,106 / 15 |    −11% | −46% |
| Opus     | 19,435 / 17 | 18,512 / 10 |     −5% | −18% |
| Fable 5  | 18,476 / 22 | 15,304 / 12 |    −17% | −42% |

What the tree agent ran:

{% tabs %}
{% tab label="Sonnet 5" %}

```bash
npx -y @redocly/cli tree rebilly.yaml --format=ai
npx -y @redocly/cli tree rebilly.yaml --format=ai --find=subscription
npx -y @redocly/cli tree rebilly.yaml --format=ai --tag=Products
npx -y @redocly/cli tree rebilly.yaml --format=ai --tag=Plans
npx -y @redocly/cli tree rebilly.yaml --format=ai --path=/products --operation=post --with-deps
npx -y @redocly/cli tree rebilly.yaml --format=ai --path=/plans --operation=post --with-deps
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionPlan --with-deps
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=PlanPriceFormula --with-deps
npx -y @redocly/cli tree rebilly.yaml --format=ai --path=/subscriptions --operation=post --with-deps
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=requestBodies --name=Subscription --with-deps
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=Subscription --pointer
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem --with-deps
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=Subscription
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=OriginalPlan
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=CustomerId
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=WebsiteId
```

15 tool calls, 16 invocations: this model bundled several commands into one shell call.

{% /tab %}
{% tab label="Opus" %}

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
This is the description where the index is worked hardest — a subscription pulls in a dozen schemas — and where the two metrics diverge most: the context saving is 5–17%, while the cost saving is 18–46%, because the no-tree agent spends 17 to 31 searches against 10 to 15 bounded calls, and every one of them re-sends the whole context.

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

| Model    |    no tree |      tree | Context | Cost |
| -------- | ---------: | --------: | ------: | ---: |
| Sonnet 5 | 16,841 / 1 | 7,397 / 7 |    −56% | −49% |
| Opus     | 16,916 / 2 | 9,375 / 4 |    −45% |  −3% |
| Fable 5  | 16,840 / 1 | 8,181 / 7 |    −51% |  −4% |

What the tree agent ran:

{% tabs %}
{% tab label="Sonnet 5" %}

```bash
npx -y @redocly/cli tree cafe.yaml --format=ai
npx -y @redocly/cli tree cafe.yaml --format=ai --path=/menu --operation=get --with-deps
npx -y @redocly/cli tree cafe.yaml --format=ai --path=/orders --operation=post --with-deps
npx -y @redocly/cli tree cafe.yaml --format=ai --path=/orders/{orderId} --operation=get --with-deps
npx -y @redocly/cli tree cafe.yaml --format=ai --component=securitySchemes --name=OAuth2
npx -y @redocly/cli tree cafe.yaml --format=ai --component=schemas --name=Beverage
npx -y @redocly/cli tree cafe.yaml --format=ai --pointer='#/components/schemas/Order'
```

{% /tab %}
{% tab label="Opus" %}

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
That read is the whole cost: ~16,850 tokens of context on every model, against 7,400–9,400 through cards. Halving the context is the most consistent result in the grid. In money the picture is flatter — a single big read is cheap to bill, so the same halving shows up as −49% on Sonnet 5 but only −3% on Opus.

{% /tab %}
{% /tabs %}

## The grid in one view

Context the run added, and the tool calls it took:

| Description | Model    |     no tree |        tree | Difference |
| ----------- | -------- | ----------: | ----------: | ---------: |
| GitHub REST | Sonnet 5 | 10,523 / 11 |   9,459 / 6 |       −10% |
| GitHub REST | Opus     |  9,024 / 10 |   9,298 / 7 |        +3% |
| GitHub REST | Fable 5  |   8,762 / 7 |   7,226 / 5 |       −18% |
| Billing API | Sonnet 5 | 24,814 / 31 | 22,106 / 15 |       −11% |
| Billing API | Opus     | 19,435 / 17 | 18,512 / 10 |        −5% |
| Billing API | Fable 5  | 18,476 / 22 | 15,304 / 12 |       −17% |
| Cafe API    | Sonnet 5 |  16,841 / 1 |   7,397 / 7 |       −56% |
| Cafe API    | Opus     |  16,916 / 2 |   9,375 / 4 |       −45% |
| Cafe API    | Fable 5  |  16,840 / 1 |   8,181 / 7 |       −51% |

What the same runs were billed:

| Description | Model    | no tree |   tree | Difference |
| ----------- | -------- | ------: | -----: | ---------: |
| GitHub REST | Sonnet 5 |  $0.338 | $0.253 |       −25% |
| GitHub REST | Opus     |  $0.372 | $0.390 |        +5% |
| GitHub REST | Fable 5  |  $0.703 | $0.586 |       −17% |
| Billing API | Sonnet 5 |  $0.825 | $0.444 |       −46% |
| Billing API | Opus     |  $0.720 | $0.592 |       −18% |
| Billing API | Fable 5  |  $1.665 | $0.964 |       −42% |
| Cafe API    | Sonnet 5 |  $0.390 | $0.200 |       −49% |
| Cafe API    | Opus     |  $0.348 | $0.337 |        −3% |
| Cafe API    | Fable 5  |  $0.635 | $0.610 |        −4% |

## How this was measured

Every run is a fresh Claude Code session started from the command line with the task text as its only input, allowed to run shell commands, read files and search them.
Sessions start in an empty directory with the description outside any repository, so no `AGENTS.md` or `CLAUDE.md` reaches the model; the tree runs call a published `@redocly/cli` snapshot through `npx`.
Each cell is one run, both tables report that same run, and all 18 answers were checked and correct on both sides.

**context** — from the run's transcript, `~/.claude/projects/<directory>/<session_id>.jsonl`, over the `assistant` records that carry a `message.usage`.
A turn's context is `input_tokens + cache_read_input_tokens + cache_creation_input_tokens`, which is the whole prompt the model was handed on that turn; the table gives the last turn's minus the first turn's.
The first turn is the system prompt plus the task, so the subtraction drops 26,000 to 43,000 tokens that are identical in both conditions and drift between batches.

**actions** — `tool_use` blocks in those same records. One shell call can chain several commands with `;`, so a run's command list is sometimes longer.

**cost** — `total_cost_usd` as the run itself reports it, not recomputed here. Prices differ per model, so amounts compare across a row, not down a column.

**Noise.** Repeating a cell through the index lands within a few percent, without it by up to 83% — one billing-API baseline measured 18,476 and 27,437 on different days — so treat anything under about 15% of context as a tie.
A no-tree run that finishes in two calls on a large description has usually handed the task to a sub-agent, whose context is not reported; those are discarded and repeated.
