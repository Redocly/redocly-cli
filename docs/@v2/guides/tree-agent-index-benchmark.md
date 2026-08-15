# What the `tree` index costs an agent, measured

Same multi-step task, two fresh isolated sessions per description (Claude Sonnet 5):
one agent explores with `tree` and the `ai` format, the control reads the raw YAML directly and may not use OpenAPI tooling or repository instructions.
The tree agent's prompt is the task plus a five-command protocol (overview → `--find "<words>"` → operation cards with `--with-deps` → component cards → tag listing only to browse an area);
the control's prompt is the same task plus "work directly with the file".
Numbers are Claude's own usage counters:
**session** = the run's final context, **output** = generated tokens, **actions** = tool calls.

Descriptions: GitHub REST (`api.github.com.yaml` from [`github/rest-api-description`](https://github.com/github/rest-api-description), 10.0 MB — 1,946,549 tokens),
a billing API (Rebilly, 1.3 MB — 267,739 tokens), the Cafe demo API (41 KB — 9,042 tokens).

## The head-to-heads

{% tabs %}
{% tab label="GitHub REST · 10.0 MB" %}

**Task:** publish a release, upload a zip asset to it, delete the asset — hosts, required fields, what feeds each next request.
Trap: the upload operation overrides its server to `https://uploads.github.com` at the operation level.

| Run              | Session |     Output | Actions |
| ---------------- | ------: | ---------: | ------: |
| No tool          |  66,246 |     19,789 |      20 |
| `tree` with `ai` |  66,862 | **16,952** |      19 |

Commands the tree agent ran:

```
redocly tree github-api.yaml --format=ai
redocly tree github-api.yaml --find "release" --format=ai
redocly tree github-api.yaml --find "upload asset" --format=ai
redocly tree github-api.yaml --path=/repos/{owner}/{repo}/releases --operation=post --with-deps --format=ai
redocly tree github-api.yaml --path=/repos/{owner}/{repo}/releases/{release_id}/assets --operation=post --with-deps --format=ai
redocly tree github-api.yaml --path=/repos/{owner}/{repo}/releases/assets/{asset_id} --operation=delete --with-deps --format=ai
redocly tree github-api.yaml --find "security scheme authentication token" --format=ai
redocly tree github-api.yaml --component=headers --name=x-github-api-version --format=ai
redocly tree github-api.yaml --component=schemas --name=release --format=ai
redocly tree github-api.yaml --component=examples --name=release --format=ai
redocly tree github-api.yaml --component=examples --name=release-asset-response-for-successful-upload --format=ai
redocly tree github-api.yaml --component=responses --name=validation_failed --format=ai
```

Both agents correct, including the host override. No tag listing was ever needed — `--find` replaced it.

{% /tab %}
{% tab label="Billing API · 1.3 MB" %}

**Task:** create a product, a recurring-billing plan for it, then subscribe an existing customer.
Traps: `Plan` is an `anyOf` without a discriminator (the recurring variant is `SubscriptionPlan`), and the subscription lives under the `Orders` tag.

| Run              |    Session |     Output | Actions |
| ---------------- | ---------: | ---------: | ------: |
| No tool          |     92,648 |     31,052 |      42 |
| `tree` with `ai` | **88,915** | **22,554** |      26 |

Commands the tree agent ran:

```
redocly tree rebilly.yaml --format=ai
redocly tree rebilly.yaml --find "subscription" --format=ai
redocly tree rebilly.yaml --tag=Products --format=ai
redocly tree rebilly.yaml --tag=Plans --format=ai
redocly tree rebilly.yaml --path=/products --operation=post --with-deps --format=ai
redocly tree rebilly.yaml --component=schemas --name=Product --format=ai
redocly tree rebilly.yaml --component=requestBodies --name=Product --format=ai
redocly tree rebilly.yaml --path=/plans --operation=post --with-deps --format=ai
redocly tree rebilly.yaml --component=schemas --name=SubscriptionPlan --format=ai
redocly tree rebilly.yaml --component=schemas --name=PlanPriceFormula --format=ai
redocly tree rebilly.yaml --component=schemas --name=PlanFormulaFlatRate --format=ai
redocly tree rebilly.yaml --component=schemas --name=CurrencyCode --format=ai
redocly tree rebilly.yaml --path=/subscriptions --operation=post --with-deps --format=ai
redocly tree rebilly.yaml --component=requestBodies --name=Subscription --format=ai
redocly tree rebilly.yaml --component=schemas --name=Subscription --format=ai
redocly tree rebilly.yaml --component=schemas --name=SubscriptionOrOneTimeSaleItem --format=ai
redocly tree rebilly.yaml --component=schemas --name=OriginalPlan --format=ai
redocly tree rebilly.yaml --component=schemas --name=CustomerId --format=ai
redocly tree rebilly.yaml --component=schemas --name=WebsiteId --format=ai
redocly tree rebilly.yaml --find "apiKey bearer authentication" --format=ai
redocly tree rebilly.yaml --component=schemas --name=PlanFormulaFixedFee --format=ai
redocly tree rebilly.yaml --component=schemas --name=Plan --format=ai
```

Both agents correct, including the `anyOf` plan choice and the `Orders` tag.
Repeat runs of this pair: 88,915 / 89,387 / 77,455 — the cheapest repeat skipped the tag listings entirely.

{% /tab %}
{% tab label="Cafe API · 41 KB" %}

**Task:** find a coffee item on the menu, order it, check the order's status — including where the OAuth2 token comes from.

| Run              |    Session |     Output | Actions |
| ---------------- | ---------: | ---------: | ------: |
| No tool          | **71,430** | **12,821** |       3 |
| `tree` with `ai` |     74,020 |     35,364 |      23 |

Commands the tree agent ran (abridged — 20 tree calls):

```
redocly tree cafe.yaml --format=ai
redocly tree cafe.yaml --find "coffee" --format=ai
redocly tree cafe.yaml --path=/menu --operation=get --with-deps --format=ai
redocly tree cafe.yaml --path=/orders --operation=post --with-deps --format=ai
redocly tree cafe.yaml --path=/orders/{orderId} --operation=get --with-deps --format=ai
redocly tree cafe.yaml --path=/oauth2/register --operation=post --with-deps --format=ai
redocly tree cafe.yaml --component=securitySchemes --name=OAuth2 --format=ai
… + 13 component/find/tag spot-checks
```

The control read the whole 9,042-token file in one call — the cheapest possible session at this size.
Why so many tree calls: component cards this cheap (~100 tokens) invite over-verification — 13 of the 20 calls were spot-checks that a single file read had already covered.
Both correct; on files that fit the window, pasting the file wins.

{% /tab %}
{% /tabs %}

## The same billing task across model tiers

| Model    | No tool: session / output / actions | `tree`: session / output / actions |
| -------- | ----------------------------------- | ---------------------------------- |
| Sonnet 5 | 92,648 / 31,052 / 42                | **88,915** / 22,554 / 26           |
| Opus     | 69,971 / 16,964 / 30                | **61,844** / 11,762 / 18           |
| Fable 5  | 63,546 / 9,443 / 25                 | **56,946** / 8,747 / 19            |

The tree agent finishes cheaper on session, output, and actions on every tier; all answers correct.

## Other measured runs, one line each

| Run                                                               | Result (session / actions)                                                       |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Impact question ("what breaks if X changes"), synthetic 268k spec | tree + protocol **56,659 / 6** vs grep 88,706 / 28 vs unguided tree 127,977 / 26 |
| Same 3-call task, protocol in `AGENTS.md` vs pasted as fake quote | **67,734** vs 99,464 (agents fact-check quotes) vs grep 68,952                   |
| Whole 41 KB file pasted vs tree chain                             | dump **66,493** vs tree 95,963                                                   |
| Synthetic never-seen 268k spec, tree vs grep                      | 81,259 vs grep **69,626** — both correct, memory not required                    |
| No instruction at all, CLI merely installed                       | 111,435 — agent found `tree` itself, paid a discovery tax                        |

## Notes

- Isolation: specs live outside any repository; controls are explicitly barred from OpenAPI CLIs and repository instruction files — the first attempt without that bar was contaminated (controls found `tree` via `AGENTS.md`) and was discarded and re-run.
- Variance: repeats differ by up to ±15% of session depending on the trajectory the agent picks; compare the pair inside one row, not absolutes across rows or models.
- Session is not the bill: every action re-sends the context, so billed cache reads on the billing-API runs were 4+ million tokens per run — fewer actions is the real saving.
- Where the advantage is: fewer, bounded, repeatable actions and machine-readable answers (`--used-by` emits the dependency graph as data).
  Where it isn't: descriptions that fit the window are cheapest pasted whole, and on famous APIs a strong model greps to parity.
