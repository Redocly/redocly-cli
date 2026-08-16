# What the `tree` index costs an agent, measured

Same multi-step task, fresh isolated sessions per description and model (Claude Sonnet 5, Opus, Fable 5; English prompts):

- **no tree** — the task and the path to the file, nothing else. Neither `tree` nor Redocly is named, so the agent has no hint the command exists and works the file with general-purpose tools.
- **tree** — the same task plus the run line (`npx -y @redocly/cli@<snapshot> tree <file> --format=ai`), and one sentence: every view ends with a `next:` line naming the flags that continue from it, follow those.

Both prompts are printed in full under each description below.
Neither lists the flags, and the tree prompt links no documentation: the agent learns the surface from the output itself.

Every number is Claude's own usage counter, read from the run's transcript.
A session starts with a fixed cost — the harness system prompt and the task prompt, 31,000 to 43,000 tokens depending on the model — that is identical in both conditions and swamps the difference between them, so the tables report what the run added on top of it:

| Metric      | What it counts                                                                         |
| ----------- | -------------------------------------------------------------------------------------- |
| **context** | tokens the task itself added: the run's final context minus its own first-turn context |
| **actions** | tool calls — the number after the slash                                                |

One shell call can chain several commands with `;`, so a run's command list is sometimes longer than its action count; the per-model tabs say when that happened.
Repeats of the same cell differ by a few percent on the tree side and by up to 80% on the no-tree side, where the agent improvises its own search strategy each time; cells run more than once are reported as the median.

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
| Sonnet 5 |   5,434 / 2 |  15,921 / 9 |
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
echo "---"
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=PlanPriceFormula
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=PlanFormulaFixedFee
npx -y @redocly/cli tree rebilly.yaml --format=ai --path=/subscriptions --operation=post --with-deps
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=requestBodies --name=Subscription
echo "---items---"
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=OriginalPlan
echo "---CustomerId---"
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=CustomerId
echo "---WebsiteId---"
npx -y @redocly/cli tree rebilly.yaml --format=ai --component=schemas --name=WebsiteId
```

9 tool calls, 10 invocations: this model bundled several commands into one shell call.

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
This is the description where the index is worked hardest — a subscription pulls in a dozen schemas — and the one where results split: `tree` wins clearly on Fable 5 (which otherwise spends 24 actions grepping), and cannot be compared on Sonnet 5, whose no-tree run handed the work to a subagent in two calls — its context is not counted, so 5,434 is a floor, not a total.

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
| Sonnet 5 | 16,897 / 1 |   7,169 / 7 |
| Opus     | 16,917 / 2 | 10,671 / 12 |
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
npx -y @redocly/cli tree cafe.yaml --format=ai --component=schemas --name=Beverage
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
That read is the whole cost: ~16,800 tokens of context on every model, against 7,200–10,700 through cards. Halving what the task costs is the most consistent result in the grid — the Opus cell was repeated three times and landed at 12,500, 10,180 and 10,671.

{% /tab %}
{% /tabs %}

## The grid in one view

Context the task added, and the tool calls it took:

| Description | Model    |     no tree |        tree | Difference |
| ----------- | -------- | ----------: | ----------: | ---------: |
| GitHub REST | Sonnet 5 |  12,154 / 8 |   8,677 / 6 |       −29% |
| GitHub REST | Opus     | 10,352 / 13 |   9,255 / 8 |       −11% |
| GitHub REST | Fable 5  |   8,185 / 6 |   7,878 / 7 |        −4% |
| Billing API | Sonnet 5 |   5,434 / 2 |  15,921 / 9 |          — |
| Billing API | Opus     | 22,713 / 25 | 19,159 / 11 |       −16% |
| Billing API | Fable 5  | 18,834 / 20 | 15,448 / 12 |       −18% |
| Cafe API    | Sonnet 5 |  16,897 / 1 |   7,169 / 7 |       −58% |
| Cafe API    | Opus     |  16,917 / 2 | 10,671 / 12 |       −37% |
| Cafe API    | Fable 5  |  16,818 / 1 |   8,429 / 7 |       −50% |

Cells measured more than once carry the median; the two GitHub and Cafe Opus cells were each run three times.
The billing API on Sonnet 5 is the one cell that cannot be compared: that no-tree run spent two calls because it handed the task to a subagent, whose own context is not counted here, so 5,434 is a floor rather than a total.

All 18 answers were correct, on both sides, including the `uploads.github.com` server override and the `anyOf`-without-discriminator plan choice.
That is the first result: an agent that never opens the file answers as well as one that reads it.

**Where a no-tree agent has to ingest the description, the index halves the cost.**
The Cafe API is 41 KB — small enough to read whole, and every no-tree run does exactly that in one or two actions for about 16,800 tokens. The same answer through cards costs 7,200–10,700, on all three models.

**On the large descriptions the win is 11–29%** on five of six cells, and it comes from replacing an open-ended search with bounded ones: 11 calls against 25 on the billing API, 8 against 13 on GitHub.

**The one tie is GitHub on Fable 5**, within 4%. It is the case the index competes hardest with: a targeted `grep` on a 10 MB file returns a handful of lines, which is what a card returns too.

**The no-tree side is also the unstable one.** Three repeats of GitHub on Opus cost 8,688, 10,352 and 15,884 depending on how well the first `grep` guessed; the same cell through the index stayed inside 9,120–10,842. An index makes the cost predictable, not just lower.

## Every run behind the tables

Cells measured more than once are reported as the median above; here is every sample, so the spread is visible rather than implied.

| Description | Model    | no tree                     | tree                         |
| ----------- | -------- | --------------------------- | ---------------------------- |
| GitHub REST | Sonnet 5 | 12,154                      | 8,677                        |
| GitHub REST | Opus     | 8,688 · **10,352** · 15,884 | 9,120 · **9,255** · 10,842   |
| GitHub REST | Fable 5  | 8,185                       | 7,878                        |
| Billing API | Sonnet 5 | 5,434 (subagent)            | 15,921                       |
| Billing API | Opus     | 22,713                      | 19,159                       |
| Billing API | Fable 5  | 18,834                      | 15,448                       |
| Cafe API    | Sonnet 5 | 16,897                      | 7,169                        |
| Cafe API    | Opus     | 16,762 · **16,917**         | 10,180 · **10,671** · 12,500 |
| Cafe API    | Fable 5  | 16,818                      | 8,429                        |

The published value is in bold where a cell has more than one sample.
Two patterns show up only here: the no-tree side swings by up to 83% between identical repeats, and the tree side stays inside 19%.

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

- Reproducing: every run is `claude -p` with `--allowedTools "Bash Read Grep Glob"`, started in an empty directory, with the description outside any repository so no `AGENTS.md` or `CLAUDE.md` is loaded. The tree runs use the published snapshot `@redocly/cli@0.0.0-snapshot.1786868116` through `npx -y`.
- The numbers in the tables come from a reproduction run on a second machine state, where the starting context was 5,400 tokens lower than in the first pass — an earlier pass over the same grid produced the same tree numbers within a few percent, and the same conclusions.
- Measure the delta, not the total. A run's first-turn context — system prompt plus task prompt — moved by 5,400 tokens between two batches measured 20 minutes apart, on every model at once, without anything in the prompts changing. Raw session totals from different batches cannot be compared; context added by the run can.
- Pair a run with its transcript by the `session_id` in its own JSON result. Picking "the newest transcript" silently attaches the wrong file, and an earlier version of this page reported numbers gathered that way.
- One assistant turn can be written to the transcript as several records — thinking, text, and the tool call — repeating the same usage block. Counting records instead of turns inflates output and turn counts.
- Floors, not totals: a no-tree agent that delegates to a subagent reports only its own context, not the subagent's. It happened once here, on the billing API with Sonnet 5, and repeatedly across earlier passes — always on Sonnet 5, always on a large description.
- `npx -y @redocly/cli@<version>` printed the update-available banner to `stderr` on every call — 684 bytes of agent context per call. It is suppressed for `--format=ai` from snapshot `1786868116` on; on an older build, set `REDOCLY_SUPPRESS_UPDATE_NOTICE=true`.
- The tree runs need the build where every `ai` view ends with a `next:` line. Without it an agent that starts from a card has no in-band way to find its next call.
- Session is not the bill: every action re-sends the whole context, so billed cache reads on the billing-API runs were 4+ million tokens per run — fewer actions is the real saving.
- Where the advantage is: bounded, repeatable actions and answers that carry their own coordinates. Where it isn't: a description a model can grep well, and a baseline that quietly spends a subagent's context.
