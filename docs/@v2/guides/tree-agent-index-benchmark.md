# What the `tree` index costs an agent, measured

Same multi-step task, three fresh isolated sessions per description and model (Claude Sonnet 5, Opus, Fable 5; English prompts), 27 runs in total:

- **control** — the task, the file, and general-purpose tooling (reads, grep, sed, yq, jq, scripts). Purpose-built OpenAPI CLIs are out of scope; neither `tree` nor Redocly is named, so the agent has no hint one exists.
- **tree + protocol** — the same task, plus one line saying the `tree` command is available and pointing at the fifteen-line protocol section in `AGENTS.md`.
- **tree + full reference** — the same, but the prompt also offers the 1,800-line command reference; the agent decides how much of it to read.

No prompt lists the flags: every tree agent learns the surface from the documentation itself.
All numbers are Claude's own usage counters:
**session** = the run's final context, **output** = generated tokens, **actions** = tool calls.

Descriptions: GitHub REST (`api.github.com.yaml` from [`github/rest-api-description`](https://github.com/github/rest-api-description), 10.0 MB — far beyond any context window),
a billing API (Rebilly, 1.3 MB), the Cafe demo API (41 KB).

## The head-to-heads

{% tabs %}
{% tab label="GitHub REST · 10.0 MB" %}

**Task:** publish a release, upload a zip asset to it, delete the asset — hosts, required fields, what feeds each next request.
Trap: the upload operation overrides its server to `https://uploads.github.com` at the operation level.

| Model    |         control |     tree + protocol | tree + full reference |
| -------- | --------------: | ------------------: | --------------------: |
| Sonnet 5 | **57,012** / 15 |     57,554 / **10** |        78,538 / **9** |
| Opus     |     56,239 / 21 | **50,792** / **12** |           68,649 / 18 |
| Fable 5  |     49,078 / 13 | **46,969** / **10** |           48,701 / 11 |

Commands the tree agent ran:

```
redocly tree github-api.yaml --format=ai
redocly tree github-api.yaml --find "release" --format=ai
redocly tree github-api.yaml --find "upload asset" --format=ai
redocly tree github-api.yaml --path=/repos/{owner}/{repo}/releases --operation=post --with-deps --format=ai
redocly tree github-api.yaml --path=/repos/{owner}/{repo}/releases/{release_id}/assets --operation=post --with-deps --format=ai
redocly tree github-api.yaml --path=/repos/{owner}/{repo}/releases/assets/{asset_id} --operation=delete --with-deps --format=ai
redocly tree github-api.yaml --component=parameters --name=asset-id --format=ai
```

Both agents correct, including the host override. No tag listing was needed — two `--find` calls replaced it.

{% /tab %}
{% tab label="Billing API · 1.3 MB" %}

**Task:** create a product, a recurring-billing plan for it, then subscribe an existing customer.
Traps: `Plan` is an `anyOf` without a discriminator (the recurring variant is `SubscriptionPlan`), and the subscription lives under the `Orders` tag.

| Model    |         control |     tree + protocol | tree + full reference |
| -------- | --------------: | ------------------: | --------------------: |
| Sonnet 5 |     73,572 / 37 | **72,285** / **18** |           94,038 / 20 |
| Opus     |     74,650 / 31 | **62,746** / **22** |           69,065 / 21 |
| Fable 5  | **52,419** / 29 |     61,560 / **23** |           82,043 / 20 |

Commands the tree agent ran:

```
redocly tree rebilly.yaml --format=ai
redocly tree rebilly.yaml --find "subscription" --format=ai
redocly tree rebilly.yaml --tag=Products --format=ai
redocly tree rebilly.yaml --tag=Plans --format=ai
redocly tree rebilly.yaml --path=/products --operation=post --with-deps --format=ai
redocly tree rebilly.yaml --component=requestBodies --name=Product --format=ai
redocly tree rebilly.yaml --path=/plans --operation=post --with-deps --format=ai
redocly tree rebilly.yaml --component=schemas --name=SubscriptionPlan --format=ai
redocly tree rebilly.yaml --component=schemas --name=PlanPriceFormula --format=ai
redocly tree rebilly.yaml --component=schemas --name=PlanFormulaFixedFee --format=ai
redocly tree rebilly.yaml --path=/subscriptions --operation=post --with-deps --format=ai
redocly tree rebilly.yaml --component=requestBodies --name=Subscription --format=ai
redocly tree rebilly.yaml --component=schemas --name=Subscription --format=ai
redocly tree rebilly.yaml --component=schemas --name=SubscriptionOrOneTimeSaleItem --format=ai
redocly tree rebilly.yaml --component=schemas --name=OriginalPlan --format=ai
redocly tree rebilly.yaml --component=schemas --name=CustomerId --format=ai
redocly tree rebilly.yaml --component=schemas --name=CurrencyCode --format=ai
```

Both agents correct, including the `anyOf` plan choice and the `Orders` tag.

{% /tab %}
{% tab label="Cafe API · 41 KB" %}

**Task:** find a coffee item on the menu, create an order for it, then check that order's status — including where the OAuth2 token comes from.

| Model    |         control | tree + protocol | tree + full reference |
| -------- | --------------: | --------------: | --------------------: |
| Sonnet 5 |  63,184 / **2** | **58,961** / 11 |        58,563 / **9** |
| Opus     | 56,010 / **11** | **52,454** / 18 |           73,656 / 17 |
| Fable 5  |  53,378 / **2** | **50,920** / 15 |           71,069 / 12 |

Commands the tree agent ran:

```
redocly tree cafe.yaml --format=ai
redocly tree cafe.yaml --find "coffee" --format=ai
redocly tree cafe.yaml --path=/menu --operation=get --with-deps --format=ai
redocly tree cafe.yaml --component=schemas --name=Beverage --format=ai
redocly tree cafe.yaml --path=/orders --operation=post --with-deps --format=ai
redocly tree cafe.yaml --component=securitySchemes --name=OAuth2 --format=ai
redocly tree cafe.yaml --path=/orders/{orderId} --operation=get --with-deps --format=ai
redocly tree cafe.yaml --path=/oauth2/register --operation=post --with-deps --format=ai
redocly tree cafe.yaml --component=schemas --name=Order --format=ai
```

On a file this small the control can simply read it whole — on Sonnet 5 that took two actions total.
The index still finishes a few percent cheaper on every model, but the margin is inside single-run variance: at this size the two approaches tie, and the tree agent spends its calls on spot-checks a single read already covered.

{% /tab %}
{% /tabs %}

## The grid in one view

Session tokens, all 27 runs:

| Description | Model    |    control | tree + protocol | tree + full reference |
| ----------- | -------- | ---------: | --------------: | --------------------: |
| GitHub REST | Sonnet 5 | **57,012** |          57,554 |                78,538 |
| GitHub REST | Opus     |     56,239 |      **50,792** |                68,649 |
| GitHub REST | Fable 5  |     49,078 |      **46,969** |                48,701 |
| Billing API | Sonnet 5 |     73,572 |      **72,285** |                94,038 |
| Billing API | Opus     |     74,650 |      **62,746** |                69,065 |
| Billing API | Fable 5  | **52,419** |          61,560 |                82,043 |
| Cafe API    | Sonnet 5 |     63,184 |          58,961 |            **58,563** |
| Cafe API    | Opus     |     56,010 |      **52,454** |                73,656 |
| Cafe API    | Fable 5  |     53,378 |      **50,920** |                71,069 |

Three findings, in order of how much they matter.

**How the protocol is delivered dominates everything else.**
`tree + protocol` beats `tree + full reference` in eight of nine cells, by 1,000 to 22,000 tokens.
The gap is the cost of reading the 1,800-line command reference — roughly 21,000 tokens on Sonnet 5, 6,000 on Opus, 2,000–20,000 on Fable 5 depending on how much of it the agent chose to read.
Given the choice, agents read it; not offering it is what keeps the run cheap.

**With the protocol delivered cheaply, the index wins most pairs.**
`tree + protocol` finishes below the control in seven of nine cells, by 2% to 10%.
The two exceptions are the billing API on Fable 5 — where the control converted the YAML to JSON and queried it with `jq`, the cheapest control in the grid at 52,419 — and the GitHub task on Sonnet 5, a 1% tie.

**Actions drop almost everywhere**, and that is the steadier effect: 18 against 37 on the billing task, 12 against 21 on GitHub with Opus.
The exception is the Cafe API, where the control reads a 41 KB file in two actions and cannot be beaten on count.

All 27 answers were correct, including the `uploads.github.com` server override and the `anyOf`-without-discriminator plan choice.

## Other measured runs, one line each

| Run                                                                 | Result (session / actions)                                                       |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Impact question ("what breaks if X changes"), synthetic 1.3 MB spec | tree + protocol **56,659 / 6** vs grep 88,706 / 28 vs unguided tree 127,977 / 26 |
| Same 3-call task, protocol in `AGENTS.md` vs pasted as fake quote   | **67,734** vs 99,464 (agents fact-check quotes) vs grep 68,952                   |
| Whole 41 KB file pasted vs tree chain                               | dump **66,493** vs tree 95,963                                                   |
| Synthetic never-seen 1.3 MB spec, tree vs grep                      | 81,259 vs grep **69,626** — both correct, memory not required                    |
| No instruction at all, CLI merely installed                         | 111,435 — agent found `tree` itself, paid a discovery tax                        |

## Notes

- Isolation: specs live outside any repository; controls are explicitly barred from OpenAPI CLIs and repository instruction files — the first attempt without that bar was contaminated (controls found `tree` via `AGENTS.md`) and was discarded and re-run.
- Variance: repeat runs of the same pair differ by up to ±15% of session depending on the trajectory the agent picks; compare the pair inside one row, not absolutes across rows or models, and treat a single inverted pair as noise until repeated.
- Session is not the bill: every action re-sends the context, so billed cache reads on the billing-API runs were 4+ million tokens per run — fewer actions is the real saving.
- Where the advantage is: fewer, bounded, repeatable actions and machine-readable answers (`--used-by` emits the dependency graph as data).
  Where it isn't: descriptions that fit the window are cheapest read whole, and on famous APIs a strong model greps to parity.
