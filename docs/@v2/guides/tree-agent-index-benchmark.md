# What the `tree` index costs an agent, measured

Same multi-step task, two fresh isolated sessions per description and model (Claude Sonnet 5, Opus, Fable 5; English prompts), 18 runs in total:

- **control** — the task, the file, and general-purpose tooling (reads, grep, sed, yq, jq, scripts). Purpose-built OpenAPI CLIs are out of scope; neither `tree` nor Redocly is named, so the agent has no hint one exists.
- **tree** — the same task plus the run line, and one sentence: every view ends with a `next:` line naming the flags that continue from it, follow those.

Neither prompt lists the flags and the tree prompt links no documentation: the agent learns the surface from the output itself.
All numbers are Claude's own usage counters:
**session** = the run's final context, **output** = generated tokens, **actions** = tool calls.

Descriptions: GitHub REST (`api.github.com.yaml` from [`github/rest-api-description`](https://github.com/github/rest-api-description), 10.0 MB — far beyond any context window),
a billing API (Rebilly, 1.3 MB), the Cafe demo API (41 KB).

## The head-to-heads

{% tabs %}
{% tab label="GitHub REST · 10.0 MB" %}

**Task:** publish a release, upload a zip asset to it, delete the asset — hosts, required fields, what feeds each next request.
Trap: the upload operation overrides its server to `https://uploads.github.com` at the operation level.

| Model    |     control |               tree |
| -------- | ----------: | -----------------: |
| Sonnet 5 | 57,012 / 15 | **52,120** / **6** |
| Opus     | 56,239 / 21 | **40,432** / **6** |
| Fable 5  | 49,078 / 13 | **39,299** / **7** |

Commands the tree agent ran (Opus):

```
redocly tree github-api.yaml --format=ai
redocly tree github-api.yaml --format=ai --find="release asset"
redocly tree github-api.yaml --format=ai --find=release
redocly tree github-api.yaml --format=ai --path=/repos/{owner}/{repo}/releases --operation=post --with-deps
redocly tree github-api.yaml --format=ai --find=upload-release-asset
redocly tree github-api.yaml --format=ai --path='/repos/{owner}/{repo}/releases/{release_id}/assets' --operation=post --with-deps
redocly tree github-api.yaml --format=ai --path='/repos/{owner}/{repo}/releases/assets/{asset_id}' --operation=delete --with-deps
redocly tree github-api.yaml --format=ai --component=parameters --name=release-id
redocly tree github-api.yaml --format=ai --component=parameters --name=asset-id
```

Both agents correct, including the host override. No tag listing was needed — `--find` replaced it.

{% /tab %}
{% tab label="Billing API · 1.3 MB" %}

**Task:** create a product, a recurring-billing plan for it, then subscribe an existing customer.
Traps: `Plan` is an `anyOf` without a discriminator (the recurring variant is `SubscriptionPlan`), and the subscription lives under the `Orders` tag.

| Model    |     control |                tree |
| -------- | ----------: | ------------------: |
| Sonnet 5 | 73,572 / 37 | **60,904** / **11** |
| Opus     | 74,650 / 31 |  **47,305** / **8** |
| Fable 5  | 52,419 / 29 |  **46,173** / **9** |

Commands the tree agent ran (Opus):

```
redocly tree rebilly.yaml --format=ai
redocly tree rebilly.yaml --format=ai --tag=Products
redocly tree rebilly.yaml --format=ai --tag=Plans
redocly tree rebilly.yaml --format=ai --tag=Orders
redocly tree rebilly.yaml --format=ai --path=/products --operation=post --with-deps
redocly tree rebilly.yaml --format=ai --path=/plans --operation=post --with-deps
redocly tree rebilly.yaml --format=ai --path=/subscriptions --operation=post --with-deps
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionPlan
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem
redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanPriceFormula
redocly tree rebilly.yaml --format=ai --pointer='#/components/schemas/Subscription/required'
redocly tree rebilly.yaml --format=ai --pointer='#/components/schemas/Product/required'
redocly tree rebilly.yaml --format=ai --component=schemas --name=CurrencyCode
```

Both agents correct, including the `anyOf` plan choice and the `Orders` tag. Two `--pointer` calls checked required-field lists straight from the `$ref`s the cards printed.

{% /tab %}
{% tab label="Cafe API · 41 KB" %}

**Task:** find a coffee item on the menu, create an order for it, then check that order's status — including where the OAuth2 token comes from.

| Model    |        control |            tree |
| -------- | -------------: | --------------: |
| Sonnet 5 | 63,184 / **2** |  **50,114** / 7 |
| Opus     |    56,010 / 11 | **41,925** / 11 |
| Fable 5  | 53,378 / **2** |  **40,710** / 8 |

Commands the tree agent ran (Opus):

```
redocly tree cafe.yaml --format=ai
redocly tree cafe.yaml --format=ai --path=/menu --operation=get --with-deps
redocly tree cafe.yaml --format=ai --path=/orders --operation=post --with-deps
redocly tree cafe.yaml --format=ai --path='/orders/{orderId}' --operation=get --with-deps
redocly tree cafe.yaml --format=ai --component=securitySchemes
redocly tree cafe.yaml --format=ai --path=/oauth2/register --operation=post --with-deps
redocly tree cafe.yaml --format=ai --component=schemas --name=Order --with-deps
redocly tree cafe.yaml --format=ai --component=schemas --name=Beverage --with-deps
redocly tree cafe.yaml --format=ai --component=parameters --name=OrderId
```

On a file this small the control can simply read it whole — on Sonnet 5 that took two actions total, against the index's seven.
It still loses on tokens by a fifth: the whole file is 41 KB of context, while nine cards are a few kilobytes.

{% /tab %}
{% /tabs %}

## The grid in one view

Session tokens, all 18 runs:

| Description | Model    | control |       tree | Difference |
| ----------- | -------- | ------: | ---------: | ---------: |
| GitHub REST | Sonnet 5 |  57,012 | **52,120** |        −9% |
| GitHub REST | Opus     |  56,239 | **40,432** |       −28% |
| GitHub REST | Fable 5  |  49,078 | **39,299** |       −20% |
| Billing API | Sonnet 5 |  73,572 | **60,904** |       −17% |
| Billing API | Opus     |  74,650 | **47,305** |       −37% |
| Billing API | Fable 5  |  52,419 | **46,173** |       −12% |
| Cafe API    | Sonnet 5 |  63,184 | **50,114** |       −21% |
| Cafe API    | Opus     |  56,010 | **41,925** |       −25% |
| Cafe API    | Fable 5  |  53,378 | **40,710** |       −24% |

`tree` is cheaper in all nine pairs, by 9% to 37%, and the gap widens with the model's willingness to explore: Opus, which reads the most in the control, saves the most with the index.
Every tree agent called nothing but `tree` (one added a single `grep`), and all 18 answers were correct — including the `uploads.github.com` server override and the `anyOf`-without-discriminator plan choice.

**Actions drop everywhere except the smallest file**: 6 tool calls against 21 on GitHub with Opus, 8 against 31 on the billing task.
The Cafe API is the exception — the control reads 41 KB in two actions — and the index still wins on tokens by a fifth, because nine cards are a few kilobytes against the whole file.

**The prompt carries no documentation**, and that is deliberate.
Every `ai` view ends with a `next:` line naming the flags that continue from it, and every id it prints is already a selector, so the agent learns the surface as it goes.
Pointing the same prompt at the 1,800-line command reference instead costs 6,000 to 21,000 tokens depending on the model — the measured variants are in the table below.

## Other measured runs, one line each

| Run                                                                 | Result (session / actions)                                                                                                           |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Same prompt pointed at the 1,800-line command reference, 9 runs     | 48,701–94,038 — loses to the plain `tree` prompt in all 9 cells                                                                      |
| Same prompt pointed at the 15-line `AGENTS.md` protocol, 9 runs     | 46,969–72,285 — loses to the plain `tree` prompt in all 9 cells                                                                      |
| Same prompt without `--format=ai` in the run line, 9 runs           | 43,112–71,102 — the stylish views carry no `next:` line, so agents guessed flags, called `--help`, and fell back to reading the file |
| Impact question ("what breaks if X changes"), synthetic 1.3 MB spec | tree + protocol **56,659 / 6** vs grep 88,706 / 28 vs unguided tree 127,977 / 26                                                     |
| Same 3-call task, protocol in `AGENTS.md` vs pasted as fake quote   | **67,734** vs 99,464 (agents fact-check quotes) vs grep 68,952                                                                       |
| Whole 41 KB file pasted vs tree chain                               | dump **66,493** vs tree 95,963                                                                                                       |
| Synthetic never-seen 1.3 MB spec, tree vs grep                      | 81,259 vs grep **69,626** — both correct, memory not required                                                                        |
| No instruction at all, CLI merely installed                         | 111,435 — agent found `tree` itself, paid a discovery tax                                                                            |

## Notes

- Isolation: specs live outside any repository; every run is a fresh `claude -p` session started from an empty directory, and controls are explicitly barred from OpenAPI CLIs and repository instruction files — the first attempt without that bar was contaminated (controls found `tree` via `AGENTS.md`) and was discarded and re-run.
- The tree runs were measured on the build where every `ai` view ends with a `next:` line; without those lines an agent that starts from a card has no in-band way to find its next call, and falls back to reading the reference.
- Variance: repeat runs of the same pair differ by up to ±15% of session depending on the trajectory the agent picks; compare the pair inside one row, not absolutes across rows or models, and treat a single inverted pair as noise until repeated.
- Session is not the bill: every action re-sends the context, so billed cache reads on the billing-API runs were 4+ million tokens per run — fewer actions is the real saving.
- Where the advantage is: fewer, bounded, repeatable actions and machine-readable answers (`--used-by` emits the dependency graph as data).
  Where it isn't: descriptions that fit the window are cheapest read whole, and on famous APIs a strong model greps to parity.
