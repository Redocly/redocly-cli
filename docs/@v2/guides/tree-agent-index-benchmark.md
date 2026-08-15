# What the `tree` index costs an agent, measured

Same multi-step task, two fresh isolated sessions per description and model (Claude Sonnet 5, Opus, Fable 5; English prompts):
one agent explores with `tree` and the `ai` format, the control reads the raw YAML directly and may not use OpenAPI tooling or repository instructions.
The tree agent's prompt is the task plus a five-command protocol (overview → `--find "<words>"` → operation cards with `--with-deps` → component cards → tag listing only to browse an area);
the control's prompt is the same task plus "work directly with the file".
All numbers are Claude's own usage counters:
**session** = the run's final context, **output** = generated tokens, **actions** = tool calls.

Descriptions: GitHub REST (`api.github.com.yaml` from [`github/rest-api-description`](https://github.com/github/rest-api-description), 10.0 MB — far beyond any context window),
a billing API (Rebilly, 1.3 MB), the Cafe demo API (41 KB).

## The head-to-heads

{% tabs %}
{% tab label="GitHub REST · 10.0 MB" %}

**Task:** publish a release, upload a zip asset to it, delete the asset — hosts, required fields, what feeds each next request.
Trap: the upload operation overrides its server to `https://uploads.github.com` at the operation level.

| Model    | No tool: session / actions | `tree` with `ai`: session / actions |
| -------- | -------------------------: | ----------------------------------: |
| Sonnet 5 |                57,243 / 17 |                 **53,703** / **10** |
| Opus     |                50,787 / 18 |                 **48,538** / **11** |
| Fable 5  |                50,486 / 15 |                  **45,330** / **7** |

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

| Model    | No tool: session / actions | `tree` with `ai`: session / actions |
| -------- | -------------------------: | ----------------------------------: |
| Sonnet 5 |                71,199 / 37 |                 **68,538** / **20** |
| Opus     |            **64,375** / 30 |                     68,880 / **25** |
| Fable 5  |                63,926 / 21 |                 **54,927** / **17** |

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

| Model    | No tool: session / actions | `tree` with `ai`: session / actions |
| -------- | -------------------------: | ----------------------------------: |
| Sonnet 5 |                 59,421 / 2 |                     **57,112** / 14 |
| Opus     |                54,569 / 15 |                 **50,783** / **12** |
| Fable 5  |             52,444 / **7** |                     **48,069** / 11 |

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

Session tokens, control → `tree` with `ai`, every description on every model:

| Description | Sonnet 5            | Opus                | Fable 5             |
| ----------- | ------------------- | ------------------- | ------------------- |
| GitHub REST | 57,243 → **53,703** | 50,787 → **48,538** | 50,486 → **45,330** |
| Billing API | 71,199 → **68,538** | 64,375 → 68,880     | 63,926 → **54,927** |
| Cafe API    | 59,421 → **57,112** | 54,569 → **50,783** | 52,444 → **48,069** |

Eight of nine pairs land cheaper with the index (−4% to −10%); the ninth — the billing task on Opus — inverted by 7%, inside the observed single-run spread.
Actions drop in eight of nine as well, the exception being the Cafe API on Sonnet 5, where the control simply read the whole 41 KB file in two actions.
All eighteen answers were correct, including the `uploads.github.com` server override and the `anyOf`-without-discriminator plan choice.

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
