# What the `tree` index costs an agent, measured

Same multi-step task, two fresh isolated sessions per description (Claude Sonnet 5, English prompts):
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

| Run              |    Session |    Output | Actions |
| ---------------- | ---------: | --------: | ------: |
| No tool          |     57,243 | **5,563** |      17 |
| `tree` with `ai` | **53,703** |     7,148 |  **10** |

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

| Run              |    Session |     Output | Actions |
| ---------------- | ---------: | ---------: | ------: |
| No tool          |     71,199 |     14,836 |      37 |
| `tree` with `ai` | **68,538** | **10,109** |  **20** |

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

| Run              |    Session |    Output | Actions |
| ---------------- | ---------: | --------: | ------: |
| No tool          |     59,421 | **8,023** |   **2** |
| `tree` with `ai` | **57,112** |    14,349 |      14 |

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

The control read the whole file in one call — two actions total.
Both correct; the sessions land within a few percent of each other, which is inside single-run variance — on files this small the two approaches simply tie, and the tree agent spends its calls on spot-checks a single read already covered.

{% /tab %}
{% /tabs %}

## The same billing task across model tiers

| Model    | No tool: session / output / actions | `tree`: session / output / actions |
| -------- | ----------------------------------- | ---------------------------------- |
| Sonnet 5 | 71,199 / 14,836 / 37                | **68,538** / 10,109 / 20           |
| Opus     | **64,375** / 12,030 / 30            | 68,880 / 12,710 / 25               |
| Fable 5  | 63,926 / 8,258 / 21                 | **54,927** / 8,403 / 17            |

The tree agent cut actions on every tier and finished cheaper on session for Sonnet 5 (−4%) and Fable 5 (−14%);
the Opus pair inverted (+7%), which is inside the observed single-run spread.
All answers correct.

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
