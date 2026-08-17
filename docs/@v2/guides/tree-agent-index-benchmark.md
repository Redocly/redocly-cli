# What the `tree` index costs an agent, measured

Same multi-step task, fresh isolated sessions per description and model (Claude Sonnet 5, Opus, Fable 5; English prompts):

- **no tree** — the task and the path to the file, nothing else. Neither `tree` nor Redocly is named, so the agent has no hint the command exists and works the file with general-purpose tools.
- **tree** — the same task plus the run line (`npx -y @redocly/cli@<snapshot> tree <file> --format=ai`), and one sentence: every view ends with a `next:` line naming the flags that continue from it, follow those.

Both prompts are printed in full under each description below.
Neither lists the flags, and the tree prompt links no documentation: the agent learns the surface from the output itself.
That is deliberate on both counts — this command's reference page is 87 KB, about 20,000 tokens, and an agent offered it reads it, which costs more than the exploration it saves; and the run line carries `--format=ai`, because the stylish views are built for a terminal and end with no `next:` line, so an agent given those falls back to guessing flags and reading the file.

Every number is Claude's own usage counter, read from the run's transcript:

| Metric      | What it counts                                                                              |
| ----------- | ------------------------------------------------------------------------------------------- |
| **context** | tokens the run added to its own session: its final context minus the context it opened with |
| **actions** | tool calls — the number after the slash                                                     |

One shell call can chain several commands with `;`, so a run's command list is sometimes longer than its action count; the per-model tabs say when that happened.
A cell measured three times reports the median; a cell measured twice reports the sample less favourable to `tree`.
Why the numbers are deltas rather than session totals, and what else the setup controls for, is in [How this was measured](#how-this-was-measured) at the end.

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

| Model    |     no tree |      tree |
| -------- | ----------: | --------: |
| Sonnet 5 |  12,154 / 8 | 8,677 / 6 |
| Opus     | 10,352 / 13 | 9,255 / 8 |
| Fable 5  |   8,185 / 6 | 7,878 / 7 |

What the tree agent ran:

{% tabs %}
{% tab label="Sonnet 5" %}

```bash
npx -y @redocly/cli tree github-api.yaml --format=ai
npx -y @redocly/cli tree github-api.yaml --format=ai --find=release
npx -y @redocly/cli tree github-api.yaml --format=ai --path=/repos/{owner}/{repo}/releases --operation=post --with-deps
npx -y @redocly/cli tree github-api.yaml --format=ai --find=upload-release-asset
npx -y @redocly/cli tree github-api.yaml --format=ai --path=/repos/{owner}/{repo}/releases/{release_id}/assets --operation=post --with-deps
npx -y @redocly/cli tree github-api.yaml --format=ai --path=/repos/{owner}/{repo}/releases/assets/{asset_id} --operation=delete --with-deps
```

{% /tab %}
{% tab label="Opus" %}

```bash
npx -y @redocly/cli tree specs/github-api.yaml --format=ai
npx -y @redocly/cli tree specs/github-api.yaml --format=ai --find="release asset"
npx -y @redocly/cli tree specs/github-api.yaml --format=ai --find="create release"
npx -y @redocly/cli tree specs/github-api.yaml --format=ai --path="/repos/{owner}/{repo}/releases" --operation=post
npx -y @redocly/cli tree specs/github-api.yaml --format=ai --path="/repos/{owner}/{repo}/releases/{release_id}/assets" --operation=post
npx -y @redocly/cli tree specs/github-api.yaml --format=ai --path="/repos/{owner}/{repo}/releases/assets/{asset_id}" --operation=delete
npx -y @redocly/cli tree specs/github-api.yaml --format=ai --component=schemas --name=release
npx -y @redocly/cli tree specs/github-api.yaml --format=ai --component=schemas --name=release-asset
npx -y @redocly/cli tree specs/github-api.yaml --format=ai --component=parameters --name=release-id
npx -y @redocly/cli tree specs/github-api.yaml --format=ai --component=parameters --name=asset-id
npx -y @redocly/cli tree specs/github-api.yaml --format=ai --component=parameters --name=owner
npx -y @redocly/cli tree specs/github-api.yaml --format=ai --component=parameters --name=repo
```

8 tool calls, 12 invocations: this model bundled several commands into one shell call.

{% /tab %}
{% tab label="Fable 5" %}

```bash
npx -y @redocly/cli tree github-api.yaml --format=ai
npx -y @redocly/cli tree github-api.yaml --format=ai --find="release asset"
npx -y @redocly/cli tree github-api.yaml --format=ai --find="create release"
npx -y @redocly/cli tree github-api.yaml --format=ai --path=/repos/{owner}/{repo}/releases --operation=post --with-deps
npx -y @redocly/cli tree github-api.yaml --format=ai --path=/repos/{owner}/{repo}/releases/{release_id}/assets --operation=post
npx -y @redocly/cli tree github-api.yaml --format=ai --path=/repos/{owner}/{repo}/releases/assets/{asset_id} --operation=delete
npx -y @redocly/cli tree github-api.yaml --format=ai --component=parameters --name=release-id
npx -y @redocly/cli tree github-api.yaml --format=ai --component=parameters --name=asset-id
```

7 tool calls, 8 invocations: this model bundled several commands into one shell call.

{% /tab %}
{% /tabs %}

Both agents correct, including the host override.
No tag listing was needed: `--find` narrowed 1,000+ operations to a handful in one call, and every model started there.
Sonnet 5 shows the widest gap: eight `grep`/`sed` calls against six bounded ones.
Opus is the most volatile cell in the grid — three no-tree repeats cost 8,688, 10,352 and 15,884 depending on how well its first `grep` landed, against 9,120, 9,255 and 10,842 through the index. The table gives the median of each.

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

| Model    |     no tree |        tree |
| -------- | ----------: | ----------: |
| Sonnet 5 | 22,490 / 22 | 21,643 / 14 |
| Opus     | 22,713 / 25 | 19,159 / 11 |
| Fable 5  | 18,834 / 20 | 15,448 / 12 |

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
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=PlanPriceFormula
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=PlanFormulaFixedFee
npx -y @redocly/cli tree rebilly.yaml --format=ai --path=/subscriptions --operation=post --with-deps
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=requestBodies --name=Subscription
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=OriginalPlan
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=Subscription
```

{% /tab %}
{% tab label="Opus" %}

```bash
npx -y @redocly/cli tree rebilly.yaml --format=ai
npx -y @redocly/cli tree rebilly.yaml --format=ai --tag=Products
npx -y @redocly/cli tree rebilly.yaml --format=ai --tag=Plans
npx -y @redocly/cli tree rebilly.yaml --format=ai --tag=Orders
npx -y @redocly/cli tree $S --format=ai --path=/products --operation=post --with-deps
npx -y @redocly/cli tree $S --format=ai "$@"
npx -y @redocly/cli tree $S --format=ai --path=/plans --operation=post --with-deps
npx -y @redocly/cli tree $S --format=ai --component=schemas --name=SubscriptionPlan
npx -y @redocly/cli tree $S --format=ai --path=/subscriptions --operation=post --with-deps
```

11 tool calls, 13 invocations: this model bundled several commands into one shell call.

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
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=PlanPriceFormula
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=OriginalPlan
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=PlanFormulaFixedFee
```

{% /tab %}
{% /tabs %}

Both agents correct, including the `anyOf` plan choice and the `Orders` tag.
This is the description where the index is worked hardest — a subscription pulls in a dozen schemas — and the one where results split: `tree` wins clearly on Fable 5 (which otherwise spends 24 actions grepping), and comes out even on Sonnet 5, where the no-tree agent ran 22 searches for about what 14 bounded calls cost. An earlier repeat of that same no-tree cell handed the work to a subagent in two calls and was discarded — a subagent context is not counted, so it would have read as a 5,434 floor.

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

| Model    |    no tree |        tree |
| -------- | ---------: | ----------: |
| Sonnet 5 | 16,865 / 1 |   7,415 / 7 |
| Opus     | 16,762 / 1 | 10,671 / 12 |
| Fable 5  | 16,818 / 1 |   8,429 / 7 |

What the tree agent ran:

{% tabs %}
{% tab label="Sonnet 5" %}

```bash
npx -y @redocly/cli tree cafe.yaml --format=ai
npx -y @redocly/cli tree cafe.yaml --format=ai --path=/menu --operation=get --with-deps
npx -y @redocly/cli tree cafe.yaml --format=ai --path=/orders --operation=post --with-deps
npx -y @redocly/cli tree cafe.yaml --format=ai --path=/orders/{orderId} --operation=get --with-deps
npx -y @redocly/cli tree cafe.yaml --format=ai --component=securitySchemes --name=OAuth2
npx -y @redocly/cli tree cafe.yaml --format=ai --component=schemas --name=Order
npx -y @redocly/cli tree cafe.yaml --format=ai --component=schemas --name=MenuBaseItem
```

{% /tab %}
{% tab label="Opus" %}

```bash
npx -y @redocly/cli tree cafe.yaml --format=ai
npx -y @redocly/cli tree cafe.yaml --format=ai --path=/menu --operation=get --with-deps
npx -y @redocly/cli tree cafe.yaml --format=ai --path=/orders --operation=post --with-deps
npx -y @redocly/cli tree cafe.yaml --format=ai --path=/orders/{orderId} --operation=get --with-deps
npx -y @redocly/cli tree cafe.yaml --format=ai --component=securitySchemes
npx -y @redocly/cli tree cafe.yaml --format=ai --path=/oauth2/register --operation=post --with-deps
npx -y @redocly/cli tree cafe.yaml --format=ai --component=schemas --name=Order
npx -y @redocly/cli tree cafe.yaml --format=ai --component=schemas --name=Beverage
npx -y @redocly/cli tree cafe.yaml --format=ai --component=securitySchemes --name=OAuth2
npx -y @redocly/cli tree cafe.yaml --format=ai --component=schemas --name=MenuBaseItem
npx -y @redocly/cli tree cafe.yaml --format=ai --component=parameters --name=OrderId
npx -y @redocly/cli tree cafe.yaml --format=ai --component=schemas --name=MenuItemList
```

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
That read is the whole cost: ~16,800 tokens of context on every model, against 7,400–10,700 through cards. Halving what the task costs is the most consistent result in the grid — the Opus cell was repeated three times and landed at 12,500, 10,180 and 10,671.

{% /tab %}
{% /tabs %}

## The grid in one view

Context the task added, and the tool calls it took:

| Description | Model    |     no tree |        tree | Difference |
| ----------- | -------- | ----------: | ----------: | ---------: |
| GitHub REST | Sonnet 5 |  12,154 / 8 |   8,677 / 6 |       −29% |
| GitHub REST | Opus     | 10,352 / 13 |   9,255 / 8 |       −11% |
| GitHub REST | Fable 5  |   8,185 / 6 |   7,878 / 7 |        −4% |
| Billing API | Sonnet 5 | 22,490 / 22 | 21,643 / 14 |        −4% |
| Billing API | Opus     | 22,713 / 25 | 19,159 / 11 |       −16% |
| Billing API | Fable 5  | 18,834 / 20 | 15,448 / 12 |       −18% |
| Cafe API    | Sonnet 5 |  16,865 / 1 |   7,415 / 7 |       −56% |
| Cafe API    | Opus     |  16,762 / 1 | 10,671 / 12 |       −36% |
| Cafe API    | Fable 5  |  16,818 / 1 |   8,429 / 7 |       −50% |

All 18 answers were correct, on both sides, including the `uploads.github.com` server override and the `anyOf`-without-discriminator plan choice.
That is the first result: an agent that never opens the file answers as well as one that reads it.

**The index is cheaper in all nine cells**, from 4% to 56%, and the size of the win tracks one thing: how much of the description the no-tree agent has to pull into context.

**Where it has to read the file, the index halves the cost.**
The Cafe API is 41 KB — small enough to read whole, and every no-tree run does exactly that in one action for about 16,800 tokens. The same answer through cards costs 7,400–10,700 on all three models.

**Where it can grep, the win narrows to 4–29%** and comes from replacing an open-ended search with bounded ones: 11 calls against 25 on the billing API, 8 against 13 on GitHub. The two 4% cells — GitHub on Fable 5 and the billing API on Sonnet 5 — are where a targeted `grep` returns about what a card returns, and they are inside the repeat spread.

**The no-tree side is also the unstable one.** Three repeats of GitHub on Opus cost 8,688, 10,352 and 15,884 depending on how well the first `grep` guessed; the same cell through the index stayed inside 9,120–10,842. On the billing API with Sonnet 5 one no-tree repeat cost 22,490 across 22 searches while another delegated the whole task to a subagent in two calls. An index makes the cost predictable, not just lower.

## How this was measured

Every run is a fresh session of an agent — Claude Code, driven from the command line with the task text as its only input.
The agent is allowed to run shell commands, read files and search them, and nothing else is prepared for it: no scripts, no cached results, no earlier session to learn from.
Each session starts in an empty directory, and the API descriptions sit outside any repository, so no `AGENTS.md`, `CLAUDE.md` or other project instructions reach the model.
The tree runs call a published `@redocly/cli` snapshot through `npx`.

**What the numbers count.**
A session opens with a fixed cost — the agent's own system prompt plus the task, 26,000 to 43,000 tokens depending on the model — before it does anything at all.
That cost is identical in both conditions, and it drifts on its own: between two batches taken twenty minutes apart it moved by 5,400 tokens on every model at once, with nothing in the prompts changed.
So the tables report the context each run added on top of its own opening cost, never the session total. Runs from different batches can only be compared this way.

**A run that hands the work to a sub-agent does not count as cheap.**
An agent can delegate a task, and the session then reports only its own context, not the sub-agent's.
Such a run finishes in two calls and looks like the cheapest cell in the grid, while the work it paid for is invisible.
Those runs are discarded and repeated. It happens on the two large descriptions with Sonnet 5.

**Repeats vary, and unevenly.**
The same cell repeated through the index lands within a few percent; without the index it swings by up to 83%, because the agent invents a fresh search strategy every time.
Treat any difference under about 15% as noise — including the two 4% cells in the grid.

**Context is not the invoice.**
Every action re-sends the whole context, so the billed cache reads on the billing-API runs reach 4+ million tokens per run.
What these tables measure is how much the model has to hold at once, which is what decides whether a task is feasible on a large description at all.
The part that shows up on an invoice is the drop in the number of actions.

**Where the advantage is, and where it is not.**
It is in bounded, repeatable calls and in answers that carry their own file and line coordinates, so anything can be checked against the source.
It is not in descriptions a model can grep well: on a famous API where a first guess at a search term lands, an index and a `grep` cost about the same.
