# What the `tree` index costs an agent, measured

Same multi-step task, fresh isolated sessions per description and model (Claude Sonnet 5, Opus, Fable 5; English prompts):

- **no tree** — the task and the path to the file, nothing else. Neither `tree` nor Redocly is named, so the agent has no hint the command exists and works the file with general-purpose tools.
- **tree** — the same task plus the run line (`npx -y @redocly/cli@<snapshot> tree <file> --format=ai`), and one sentence: every view ends with a `next:` line naming the flags that continue from it, follow those.

Both prompts are printed in full under each description below.
Neither lists the flags, and the tree prompt links no documentation: the agent learns the surface from the output itself.

Every number is Claude's own usage counter, read from the run's transcript:

| Metric      | What it counts                                                                               |
| ----------- | -------------------------------------------------------------------------------------------- |
| **session** | the run's final context — what the last request carried, and the first number in every table |
| **actions** | tool calls — the number after the slash                                                      |

One shell call can chain several commands with `;`, so a run's command list is sometimes longer than its action count; the per-model tabs say when that happened.
The tree condition ran twice per cell — once against a locally built CLI, once against the published snapshot — because a single run cannot separate differences smaller than the ±15% spread between repeats.

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

| Model    |     no tree | tree, run 1 | tree, run 2 |
| -------- | ----------: | ----------: | ----------: |
| Sonnet 5 |  47,709 / 2 |  46,375 / 6 |  52,119 / 6 |
| Opus     | 41,245 / 10 |  34,315 / 8 | 41,771 / 11 |
| Fable 5  |  41,765 / 8 |  33,986 / 6 |  38,569 / 5 |

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
npx -y @redocly/cli tree github-api.yaml --format=ai --find=release+asset
npx -y @redocly/cli tree github-api.yaml --format=ai --find=release
npx -y @redocly/cli tree github-api.yaml --format=ai --path='/repos/{owner}/{repo}/releases' --operation=post
npx -y @redocly/cli tree github-api.yaml --format=ai --find=upload
npx -y @redocly/cli tree github-api.yaml --format=ai --find=upload-release-asset
npx -y @redocly/cli tree github-api.yaml --format=ai --path='/repos/{owner}/{repo}/releases/{release_id}/assets' --operation=post
npx -y @redocly/cli tree github-api.yaml --format=ai --path='/repos/{owner}/{repo}/releases/assets/{asset_id}' --operation=delete --with-deps
npx -y @redocly/cli tree github-api.yaml --format=ai --component=parameters --name=asset-id
npx -y @redocly/cli tree github-api.yaml --format=ai --component=schemas --name=release
npx -y @redocly/cli tree github-api.yaml --format=ai --component=schemas --name=release-asset
npx -y @redocly/cli tree github-api.yaml --format=ai --component=parameters --name=release-id
```

11 tool calls, 12 invocations: this model bundled several commands into one shell call.

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
The no-tree agent on Sonnet 5 delegated the search to a subagent, whose own context is not counted here — that 47,709 is a floor.

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

| Model    |     no tree | tree, run 1 | tree, run 2 |
| -------- | ----------: | ----------: | ----------: |
| Sonnet 5 |  47,265 / 2 | 58,972 / 11 | 57,228 / 12 |
| Opus     | 49,418 / 17 |  42,543 / 8 | 53,551 / 12 |
| Fable 5  | 59,349 / 24 | 41,588 / 12 | 46,846 / 12 |

What the tree agent ran:

{% tabs %}
{% tab label="Sonnet 5" %}

```bash
npx -y @redocly/cli tree rebilly.yaml --format=ai
npx -y @redocly/cli tree rebilly.yaml --format=ai --tag=Products
npx -y @redocly/cli tree rebilly.yaml --format=ai --tag=Plans
npx -y @redocly/cli tree rebilly.yaml --format=ai --path=/products --operation=post --with-deps
npx -y @redocly/cli tree rebilly.yaml --format=ai --find=subscription
npx -y @redocly/cli tree rebilly.yaml --format=ai --path=/plans --operation=post --with-deps
npx -y @redocly/cli tree rebilly.yaml --format=ai --path=/subscriptions --operation=post --with-deps
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=requestBodies --name=Subscription
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=OriginalPlan
echo ---
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=PlanPriceFormula
npx -y @redocly/cli tree rebilly.yaml --format=ai --pointer="#/components/schemas/SubscriptionPlan/properties/recurringInterval"
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=PlanFormulaFixedFee
npx -y @redocly/cli tree rebilly.yaml --format=ai --pointer="#/components/schemas/Subscription/required"
```

{% /tab %}
{% tab label="Opus" %}

```bash
npx -y @redocly/cli tree rebilly.yaml --format=ai
npx -y @redocly/cli tree rebilly.yaml --format=ai --tag=Products
npx -y @redocly/cli tree rebilly.yaml --format=ai --tag=Plans
npx -y @redocly/cli tree rebilly.yaml --format=ai --path=/products --operation=post --with-deps
npx -y @redocly/cli tree rebilly.yaml --format=ai --path=/plans --operation=post --with-deps
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionPlan
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=PlanPriceFormula --with-deps
npx -y @redocly/cli tree rebilly.yaml --format=ai --tag=Orders
npx -y @redocly/cli tree rebilly.yaml --format=ai --path=/subscriptions --operation=post --with-deps
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=requestBodies --name=Subscription
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=OriginalPlan
npx -y @redocly/cli tree rebilly.yaml --format=ai --pointer='#/components/schemas/Subscription'
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=Product
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=CustomerId
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=WebsiteId
```

12 tool calls, 17 invocations: this model bundled several commands into one shell call.

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
This is the description where the index is worked hardest — a subscription pulls in a dozen schemas — and the one where results split: `tree` wins clearly on Fable 5 (which otherwise spends 24 actions grepping), and loses to Sonnet 5, whose no-tree run again delegated to an uncounted subagent.

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

| Model    |    no tree | tree, run 1 | tree, run 2 |
| -------- | ---------: | ----------: | ----------: |
| Sonnet 5 | 59,245 / 1 |  44,631 / 6 |  50,034 / 7 |
| Opus     | 47,920 / 2 |  35,756 / 5 | 42,227 / 12 |
| Fable 5  | 48,150 / 1 |  35,581 / 8 |  39,967 / 7 |

What the tree agent ran:

{% tabs %}
{% tab label="Sonnet 5" %}

```bash
npx -y @redocly/cli tree cafe.yaml --format=ai
npx -y @redocly/cli tree cafe.yaml --format=ai --path=/menu --operation=get --with-deps
npx -y @redocly/cli tree cafe.yaml --format=ai --path=/orders --operation=post --with-deps
npx -y @redocly/cli tree cafe.yaml --format=ai --path=/orders/{orderId} --operation=get --with-deps
npx -y @redocly/cli tree cafe.yaml --format=ai --component=schemas --name=Beverage
npx -y @redocly/cli tree cafe.yaml --format=ai --component=schemas --name=Order --with-deps
npx -y @redocly/cli tree cafe.yaml --format=ai --component=securitySchemes --name=OAuth2
```

{% /tab %}
{% tab label="Opus" %}

```bash
npx -y @redocly/cli tree cafe.yaml --format=ai
npx -y @redocly/cli tree cafe.yaml --format=ai --path=/menu --operation=get --with-deps
npx -y @redocly/cli tree cafe.yaml --format=ai --path=/orders --operation=post --with-deps
npx -y @redocly/cli tree cafe.yaml --format=ai --path=/orders/{orderId} --operation=get --with-deps
npx -y @redocly/cli tree cafe.yaml --format=ai --component=schemas --name=Order
npx -y @redocly/cli tree cafe.yaml --format=ai --component=securitySchemes
npx -y @redocly/cli tree cafe.yaml --format=ai --path=/oauth2/register --operation=post --with-deps
npx -y @redocly/cli tree cafe.yaml --format=ai --component=securitySchemes --name=OAuth2
npx -y @redocly/cli tree cafe.yaml --format=ai --component=schemas --name=Beverage --with-deps
npx -y @redocly/cli tree cafe.yaml --format=ai --component=parameters --name=OrderId
npx -y @redocly/cli tree cafe.yaml --format=ai --component=schemas --name=MenuItemList --with-deps
npx -y @redocly/cli tree cafe.yaml --format=ai --component=schemas --name=MenuBaseItem
```

{% /tab %}
{% tab label="Fable 5" %}

```bash
npx -y @redocly/cli tree cafe.yaml --format=ai
npx -y @redocly/cli tree cafe.yaml --format=ai --path=/menu --operation=get --with-deps
npx -y @redocly/cli tree cafe.yaml --format=ai --path=/orders --operation=post --with-deps
npx -y @redocly/cli tree cafe.yaml --format=ai --path=/orders/{orderId} --operation=get --with-deps
npx -y @redocly/cli tree cafe.yaml --format=ai --component=securitySchemes --name=OAuth2
npx -y @redocly/cli tree cafe.yaml --format=ai --path=/oauth2/register --operation=post --with-deps
npx -y @redocly/cli tree cafe.yaml --format=ai --component=schemas --name=Order
```

{% /tab %}
{% /tabs %}

On a file this small the no-tree agent simply reads it whole — one action.
It still loses on tokens by 12–25%: the file is 41 KB of context, while a handful of cards is a few kilobytes. This is the most consistent result in the grid, reproduced on all three models.

{% /tab %}
{% /tabs %}

## The grid in one view

Session tokens, no tree against the range across the two tree runs:

| Description | Model    | no tree |          tree | Difference |
| ----------- | -------- | ------: | ------------: | ---------: |
| GitHub REST | Sonnet 5 |  47,709 | 46,375–52,119 |     −3…+9% |
| GitHub REST | Opus     |  41,245 | 34,315–41,771 |    −17…+1% |
| GitHub REST | Fable 5  |  41,765 | 33,986–38,569 |    −19…−8% |
| Billing API | Sonnet 5 |  47,265 | 57,228–58,972 |   +21…+25% |
| Billing API | Opus     |  49,418 | 42,543–53,551 |    −14…+8% |
| Billing API | Fable 5  |  59,349 | 41,588–46,846 |   −30…−21% |
| Cafe API    | Sonnet 5 |  59,245 | 44,631–50,034 |   −25…−16% |
| Cafe API    | Opus     |  47,920 | 35,756–42,227 |   −25…−12% |
| Cafe API    | Fable 5  |  48,150 | 35,581–39,967 |   −26…−17% |

All 27 answers were correct, on both sides, including the `uploads.github.com` server override and the `anyOf`-without-discriminator plan choice.
That is the first result: an agent that never opens the file answers as well as one that reads it.

**The index wins outright on six of nine cells**, by 8% to 30%, and the win is most consistent where the description is small enough that a no-tree agent reads it whole: the Cafe API costs 12–26% less through cards on every model, because 41 KB of file is more context than a handful of cards.

**Two cells are a tie** — GitHub on Sonnet 5 and the billing API on Opus, where the two tree runs straddle the baseline. At that distance a single run says nothing; both are inside the repeat spread.

**One cell loses**: the billing API on Sonnet 5, and it is the least comparable of the nine. That no-tree run spent two actions — it handed the task to a subagent, whose own context is not counted in `session`, so 47,265 is a floor, not a total. The same delegation happened in the GitHub Sonnet 5 baseline.

**Actions tell a steadier story than tokens.** On the two large descriptions the index costs 5–12 calls against 8–24, and every one of them is bounded: an operation card, a component card, a search. The no-tree runs that grep well are cheap; the ones that grep badly (Fable 5 on the billing API: 24 actions, 59,349) are the worst cells in the grid.

## Other measured runs, one line each

Each row is its own set of isolated runs. The first two change one thing in the tree prompt and nothing else, so they price the prompt itself.

| Run                                                        | Result                                                                                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Tree prompt pointed at this command's reference page       | The page is 87 KB, roughly 20,000 tokens, and agents that are offered it read it — more than the exploration saves |
| Tree prompt without `--format=ai` in the run line          | Agents guessed flags, called `--help`, and fell back to reading the file: the stylish views carry no `next:` line  |
| Impact question ("what breaks if X changes"), 1.3 MB spec  | tree 56,659 / 6 actions vs grep 88,706 / 28                                                                        |
| Protocol in `AGENTS.md` vs the same text pasted as a quote | 67,734 vs 99,464 — agents fact-check a quoted instruction against the file, and pay for it                         |
| No instruction at all, the CLI merely installed            | 111,435 — the agent found `tree` by itself and paid a discovery tax                                                |

The last three ran against earlier builds with a different measurement script; read them for direction, not for absolute numbers.

## Notes

- Reproducing: every run is `claude -p` with `--allowedTools "Bash Read Grep Glob"`, started in an empty directory, with the description outside any repository so no `AGENTS.md` or `CLAUDE.md` is loaded. The kit that holds the prompts and the measuring script is linked from the [command reference](../commands/tree.md).
- Measure by session id, not by "the newest transcript": the run's own JSON result carries `session_id`, and that is the only safe way to pair a run with its transcript. An earlier version of this page reported numbers paired the unsafe way, and they were wrong.
- One assistant turn can be written to the transcript as several records — thinking, text, and the tool call — that repeat the same usage block. Counting records instead of turns inflates output and turn counts; `session` and action counts are unaffected.
- Floors, not totals, in two cells: the no-tree agents on Sonnet 5 delegated the GitHub and billing tasks to a subagent, whose context is not counted in `session`.
- `npx -y @redocly/cli@<version>` printed the update-available banner to `stderr` on every call — 684 bytes of agent context per call. That is now suppressed for `--format=ai`; on an older build, set `REDOCLY_SUPPRESS_UPDATE_NOTICE=true`.
- The tree runs need the build where every `ai` view ends with a `next:` line. Without it an agent that starts from a card has no in-band way to find its next call.
- Variance: repeats of the same cell differ by up to ±15% of session depending on the trajectory the agent picks. Differences below that are not results.
- Session is not the bill: every action re-sends the context, so billed cache reads on the billing-API runs were 4+ million tokens per run — fewer actions is the real saving.
- Where the advantage is: bounded, repeatable actions and answers that carry their own coordinates. Where it isn't: a description a model can grep well, and a baseline that quietly spends a subagent's context.
