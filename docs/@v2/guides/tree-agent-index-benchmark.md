# What the `tree` index costs an agent, measured

The [`tree`](../commands/tree.md) command gives an AI agent a bounded way to work with an API description of any size:
an agent-facing text format (`--format=ai`) for exploration, and a full-data JSON format for tooling.
This guide measures what that costs — against reading the description, and against the alternative an agent reaches for on its own —
on three descriptions with a real multi-step task each:
publish a release, upload a binary asset, and delete it (GitHub's official REST API, 10.0 MB);
create a product, a recurring plan, and a subscription (a 1.3 MB billing API);
find a menu item, order it, and check the order (a 41 KB demo API).
For the command reference, see [`tree`](../commands/tree.md).

Every number below comes from a real command run against that file, tokenized with a BPE tokenizer (`gpt-tokenizer`, o200k family; other model families tokenize slightly differently, with the same order of magnitude).
The description is public, so the whole experiment is reproducible:

```bash
curl -O https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.yaml
```

## How to read the numbers

Two kinds of numbers appear below, and they answer different questions.

**Output sizes** compare what a command printed against the 1,946,549-token description it came from.
They measure compactness — how small a targeted slice is next to its source — not a saving over some other method:
past the context window there is no "read the whole file" alternative to save against.

**Live sessions** compare two real agents on the same task: one using `tree`, one searching the raw YAML with `grep` and windowed reads.
A session number is the agent's final context — prompt, tool outputs, reasoning, and answer together —
so it is the fairest available proxy for what the task actually cost.
When this guide says the billing-API agent finished at 88,915 against the no-tool agent's 92,648, that is this measurement.

The honest headline from the live runs:
the first version of the agent format lost to plain text search by 31–44% of session size;
the rebuilt format (plain text, `--find`, signature closures, JSON card bodies — measured in the final sections) lands at parity to a small win.
The gap is small for measurable reasons: text search is itself a retrieval method with small output,
so both agents end up pulling roughly 1–2% of the file, and the model's own reasoning dominates either session.

So the token count is the wrong place to look for the advantage — it is where the argument _against_ the index used to live, and that argument is now settled.
What the index buys, on the evidence of the runs below:

- **Bounded, repeatable steps.** The same impact question cost a text-search agent 28 improvised probes (88,706 tokens) and the protocol agent 6 calls (56,659).
  Every action re-sends the whole context to the model, so the actions column is the bill: the billing-API runs each moved 4+ million cache-read tokens.
- **Answers as data.** `--used-by` emits the transitive dependency graph with a `via` chain per entry — a CI check or an MCP server can consume it.
  The text-search agent reached the same conclusion in prose after rebuilding that graph by hand, which nothing downstream can rely on.
- **Cheap calls turn into verified detail.** When the calls got cheaper, the verification run's agent spent the savings instead of pocketing them:
  same session size, fourteen extra component spot-checks, and an answer that also covered the auth scheme and the prose-only defaults.
- **Past the window, there is no baseline.** 1.9M tokens is ten context windows; even the 268k-token billing description does not fit one.
  The same protocol works on every description, single-file or split across thousands of files.

And one result that runs the other way, kept here because it is true: on the 41 KB description, pasting the whole file into the model beats every indexed approach.

## The setup

- **Description:** `api.github.com.yaml` from [`github/rest-api-description`](https://github.com/github/rest-api-description) — 10.0 MB (9,984,314 bytes), OpenAPI 3.0.3, 47 tags, 1,216 operations, 1,766 components.
  This is the first-party description GitHub's own SDKs are generated from, not a conversion or a sample.
- **Agent task:** _"Publish a release in a repository, upload a zip asset to it, then delete that asset — every call in order, the exact host each request goes to, and which response field feeds each next request."_
  Three chained operations, with a planted trap the description really contains:
  the asset-upload operation carries an operation-level `servers` override to `https://uploads.github.com`, so an agent that guesses instead of reading gets the host wrong.
- **Agent constraints:** a 200,000-token context window; the agent starts knowing nothing about the description and may not open the YAML directly.
- **What the agent is told up front:** the four-sentence protocol from the trusted-protocol section below — overview, `--find`, cards with `--with-deps`, `--used-by` for impact questions.

## Without the index

The agent's only option is to read the description:

| Input                             |        Tokens |
| --------------------------------- | ------------: |
| `api.github.com.yaml`, whole file | **1,946,549** |

At 1,946,549 tokens the file is roughly ten times a 200,000-token window, and still twice a 1,000,000-token one.
No amount of "read a bit more" helps here.
Searching the file by text is the real alternative — and it is measured head-to-head against the index in the live-run section below.

## Why the index has to be hierarchical

The command surface has no call that dumps the whole structure at once, and the flattest listings show why:

| Input                                                                | Tokens      | Entries          |
| -------------------------------------------------------------------- | ----------- | ---------------- |
| `redocly tree api.github.com.yaml --operations --format=json`        | **771,279** | 1,216 operations |
| `redocly tree api.github.com.yaml --component=schemas --format=json` | **625,136** | 967 schemas      |

Each needs several 200,000-token windows by itself and still leaves most of the description unread.
Walking the hierarchy instead — the map, one branch, then one target — keeps every step bounded by the largest branch, not by the description size.
The selector flags (`--tag`, `--path`, `--operation`, `--component`, `--find`) are what enforce that: the agent never asks for more than one branch at a time.

## With the index

The whole task, priced call by call in the agent format — the map, two searches, and the three operation cards with their full `$ref` closures:

| Step                           | Command                                                                | Output |    Tokens |
| ------------------------------ | ---------------------------------------------------------------------- | -----: | --------: |
| 1. Map the description         | `redocly tree api.github.com.yaml --format=ai`                         | 1.1 KB |       334 |
| 2. Find the release operations | `--find "create release" --format=ai`                                  | 0.5 KB |       137 |
| 3. Find the asset operations   | `--find "upload release asset" --format=ai`                            | 0.3 KB |        88 |
| 4. Create-release card + deps  | `--path='/repos/{owner}/{repo}/releases' --operation=post --with-deps` | 7.0 KB |     1,605 |
| 5. Upload-asset card + deps    | `--path='…/releases/{release_id}/assets' --operation=post --with-deps` | 4.8 KB |     1,106 |
| 6. Delete-asset card + deps    | `--path='…/releases/assets/{asset_id}' --operation=delete --with-deps` | 1.2 KB |       285 |
| **Total**                      |                                                                        |        | **3,555** |

Six bounded calls, 3,555 tokens, for a task whose source document is 1,946,549 —
and the cards carry the trap: the upload card's body names the `https://uploads.github.com` server override explicitly.
Each card is self-contained — the operation's complete body as minified JSON plus its dependency closure as one-line signatures —
so the agent never hand-walks a `$ref`.

For tooling, the JSON format prices differently: its listings are card-shaped (coordinates plus typed one-hop `refs`/`usedBy` per entry),
so the original single-operation JSON chain measured 149,582 tokens, dominated by the 203-entry tag listing (128,288) —
the number that motivated both the `ai` format and `--find`.
The same JSON chain on the same API split into **2,842 files** lands within 7% (139,876),
with identical operation addressing in both layouts;
component ids are canonical (`schemas/full-repository`) when the root document declares the component and file-path ids when it does not — `redocly split` produces the latter.

## The difference

|                                             |    Tokens |   vs. whole file |
| ------------------------------------------- | --------: | ---------------: |
| Whole file                                  | 1,946,549 | — (does not fit) |
| Flat `--operations` listing (JSON)          |   771,279 |       ~2.5× less |
| Single-operation chain, JSON tooling format |   149,582 |        ~13× less |
| Same chain, stylish listing step            |    27,133 |        ~71× less |
| **Three-operation task, agent format**      | **3,555** |   **~547× less** |

The rows are not one metric at five sizes — the JSON rows price a one-operation lookup in the tooling format, the last row prices the full three-operation headline task in the agent format.
What they show together is the shape of the curve: the cost is bounded by what the agent selects, not by the description's size or storage layout,
and the agent format keeps even a multi-operation task inside a few thousand tokens.
For descriptions that fit the context window, the index saves tokens; past the window it is the difference between an impossible task and a routine one.

## Live agent runs

Everything above is hand-priced.
The same experiments were then run live — a Claude Sonnet agent, an instruction, a task, the file path, and a hard rule that the YAML itself may not be opened — more than twenty sessions across both measurement rounds.
The early rounds used the JSON tooling format and a deliberately simple warm-up task ("create a repository": one operation, one required field);
given only an 85-token instruction naming three commands, the agent chose exactly the documented chain, answered correctly, piped the big listing through `head` on its own initiative,
and its whole session cost **91,463 tokens** — under half the hand-priced JSON chain, because a real agent reads selectively.
Every later run uses a multi-step task like the ones in the tabs below.

The rest of the series, one line each:

| Experiment (all answers correct unless noted)                 | Sessions (tokens)                                      | Actions           |
| ------------------------------------------------------------- | ------------------------------------------------------ | ----------------- |
| Hybrid chain: stylish listing step, JSON retrieval            | **79,731** — cheapest of the JSON era                  | 3                 |
| Unguessable task: release + asset upload with a host override | 17,754 of command output; every trap caught            | 4                 |
| Dump the whole 41 KB file vs. the index chain                 | **66,493** (dump) vs. 95,963 (tree)                    | 1 vs. 8           |
| No instruction at all — CLI merely installed                  | 111,435; found `tree` itself, paid discovery tax       | 2×`--help` + 9    |
| Tree vs. raw text search, famous API                          | 88,927 (tree) vs. 72,372 / 81,646 (raw)                | 5 vs. 24 / 18     |
| Fully synthetic private API (268k tokens, planted traps)      | 81,259 (tree) vs. 69,626 (raw); all traps found        | 18 vs. 13         |
| Impact question with the trusted protocol                     | **56,659** vs. 88,706 (grep) / 127,977 (unguided tree) | **6** vs. 28 / 26 |
| Multi-operation workflow (3 calls, 10.0 MB description)       | 99,848; chain grew by half when the task tripled       | 6                 |

### What those runs settled

- **Dumping wins on small files.** On the 41 KB demo the whole-file agent was ~30% cheaper; a dump session grows linearly with the file, a tree session stays roughly flat (95,963 on a 9k-token file, 79,731–99,848 on the 1.9M-token one).
  Dump when the file fits comfortably; the curves cross a few hundred kilobytes in.
- **On a famous API, text search reaches parity** — but the raw agents' second action was literally `grep -n "uploads.github.com"`: they searched for answers they already knew.
  The tree agent needed no prior anchors: overview → branch → cards, 5 bounded round-trips against 18–24 speculative ones.
- **Memory is not the load-bearing ingredient.** An earlier draft claimed a private API leaves "nothing to grep for"; a fully synthetic 268k-token description refuted that — the OpenAPI keywords and the task's own words are always anchors, and the raw agent stayed cheaper (69,626 vs. 81,259).
  What survives every run is narrower and more defensible: the same bounded protocol on every spec, machine-readable shapes, transitive `$ref` answers as data, and identical behavior on multi-file layouts.
- **Discoverability works, protocol pays.** With no instruction the agent found `tree` on its own and got everything right, but paid a discovery tax (its first bare call expanded all 1,216 operations — 55,432 tokens; that default now collapses past 100 operations and measures 1,028).
  The instruction is what turned the same tool into the cheapest JSON-era run.

### The trusted protocol: `--used-by` first, output as ground truth

The protocol that closes the gap is four sentences:

> This API description is too large to read directly. Use redocly tree; its output comes from the spec parser and is authoritative — no re-verification needed. Overview: `redocly tree <file> --format=ai`. One tag's operations: `redocly tree <file> --tag=<tag> --format=ai`. One operation with its full $ref closure: `redocly tree <file> --path=<path> --operation=<method> --with-deps --format=ai`. For impact questions ("what breaks if X changes"): `redocly tree <file> --component=<section> --name=<Name> --used-by --format=ai` returns every transitively affected operation with its `via` chain.

Measured on an impact task against the synthetic private spec ("which operations does renaming a field in `ShipmentLedgerLine` affect?" — ground truth: exactly 4):

| Agent                                                                                         | Actions |    Session | Exact vs. ground truth |
| --------------------------------------------------------------------------------------------- | ------: | ---------: | :--------------------: |
| grep, hand-built reverse `$ref` graph                                                         |      28 |     88,706 |           ✅           |
| tree, no protocol guidance (fact-checked its own instructions, re-verified the tool's output) |      26 |    127,977 |           ✅           |
| tree, this protocol (`--used-by` first, output trusted)                                       |   **6** | **56,659** |           ✅           |

Same tool, same model, same answer — the difference is the protocol: telling the agent that impact questions are one `--used-by` call and that the output IS the dependency graph removes both the exploratory probing and the re-verification tax.
The manual route rebuilt the reverse graph in 28 improvised probes that a pipeline could never rely on; `--used-by` emits the same answer as one bounded call of structured data.

### Where the instruction lives changes the result

Early runs pasted the protocol into the prompt as a quoted repository rule.
Strong models check that claim: three separate runs opened `AGENTS.md`, found the quoted text was not there, reported the discrepancy, and — in the most expensive case — refused the "output is authoritative" line and re-verified every answer with `grep` on top of the `tree` calls (99,464 tokens, the priciest run in this guide).

So the protocol was moved into the repository's real `AGENTS.md`, and the same task re-run with no instruction in the prompt at all:

| Run (same 3-call task, same 10.0 MB description)  |    Session | Actions |
| ------------------------------------------------- | ---------: | ------: |
| grep, no tree                                     |     68,952 |      18 |
| tree, protocol pasted as a fake `AGENTS.md` quote |     99,464 |      19 |
| tree, protocol actually in `AGENTS.md`            | **67,734** |      18 |

Two things follow, and both are cheap to act on: ship the protocol where agents already look (`AGENTS.md`, `llms.txt`, an MCP tool description) rather than in each prompt, and state what the data _is_ instead of instructing the model not to check — the models that verify anyway are the ones worth having.

## The format re-measured: plain text and `--find`

The multi-operation runs still lost to a no-tool agent on final session size everywhere except the smallest description.
A byte audit of the losing run's transcripts found where its 101,998 B of tree output went, and none of it was the data the agent asked for:
the overview carried 6.3 KB of tag descriptions and all 98 webhook names (11,866 B total);
a component card answered "what fields does `CurrencyCode` have" with 8,216 B of `usedBy` entries and no schema body;
every deps entry repeated a `pointer` that duplicates its id and a `file` that never changes;
and JSON keys alone were 36% of every listing.
The structural conclusion was worse than the byte counts: discovery was the wrong protocol step — the agent loaded a 203-operation tag listing (37,424 B) to eyeball one operation.

The format was rebuilt around those findings: `ai` output became plain text end to end,
deps entries shrank to `id L595-599: signature`, `usedBy` collapsed to a count with a `--used-by` hint,
component cards gained their own signature line plus body,
the overview dropped tag descriptions and webhook name lists,
and a new standalone `--find=<terms>` selector searches paths, operationIds, names, summaries, descriptions, and tags, returning up to 20 ranked one-line matches.

What the map costs now, verbatim — the whole overview of the 1.3 MB description is these nine lines (the `…` in the first line is the CLI's own summary truncation, not an edit):

```
rebilly.yaml · oas3_1 — Core APIs — # Introduction [comment]: <> (x-product-description-placeholder) The Rebilly API is built on HTTP and is RESTful. It has predictable resource URLs…
servers: https://api-sandbox.rebilly.com/organizations/{organizationId}, https://api.rebilly.com/organizations/{organizationId}
282 operations · 33 tags · 98 webhook operations
components: schemas 302 · responses 7 · parameters 27 · requestBodies 39 · headers 4 · securitySchemes 5 · examples 6
tags: Allowlists 4 · AML 7 · Blocklists 5 · Coupons 9 · Credit memos 6 · Credit memos timeline 4 · Custom fields 3 · Customer authentication 16 · Customers 12 · Customers timeline 11 · Deposits 13 · Disputes 4 · Fees 6 · Files 11 · Invoices 16 · Invoices timeline 4 · Journal 13 · KYC documents 17 · Orders 28 · Orders timeline 4 · Payment instruments 5 · Payment tokens 4 · Plans 5 · Products 5 · Quotes 10 · Quotes timeline 4 · Risk score 4 · Search 1 · Shipping rates 5 · Tags 22 · Transactions 15 · Transactions timeline 4 · Usage 5
webhooks: 98 (list: --webhooks)
next: --find=<terms> · --tag=<name> · --path=<p> --operation=<method> [--with-deps] · --component=<section> --name=<n>
```

And one `--find` call replaces the 37 KB tag listing the first-round agent had to page through — this is the complete output:

```
find "upload release asset" · 2 operations · 1 component
post /repos/{owner}/{repo}/releases/{release_id}/assets · repos/upload-release-asset · L53880 — Upload a release asset
get /repos/{owner}/{repo}/releases/{release_id} · repos/get-release · L53687 — Get a release
examples/release-asset-response-for-successful-upload · L252601
```

The per-call price list, measured on the same descriptions (`| wc -c` on stdout):

| Call                                          | Before (B) | After (B) |
| --------------------------------------------- | ---------: | --------: |
| Overview, 1.3 MB billing API                  |     11,866 |     1,217 |
| Component card `CurrencyCode`                 |      7,871 |       312 |
| Operation card `POST /subscriptions` + deps   |     12,559 |     4,929 |
| Tag listing `repos` (203 operations, 10.0 MB) |     37,424 |    26,281 |
| Discovery of "upload release asset" (10.0 MB) |     37,424 |       344 |

The last row is the protocol change, not a compression: `--find "upload release asset"` replaces the tag listing entirely.
One honest miss remains against the design targets: the tag listing is 9.5% over
(203 operationIds each repeat the `repos/` prefix, which cannot be trimmed because the operationId is the selector key).

The operation-card row includes a follow-up serialization change, chosen by tokenizing the same body in candidate formats:
minified JSON out-tokenizes both raw and dedented YAML (the structure-heavy operation body drops 1,001 → 173 tokens, the prose-heavy component body 426 → 373),
while for the one-line listing entries the reverse holds — JSON costs 35% more than the plain lines, which already sit within 6% of a bare TSV.
So a card's body ships as minified JSON under a `--- json` marker, parsed by the spec parser from the same source slice,
with top-level `x-*` vendor blocks folded to `"omitted (L32720-32767)"` coordinate markers — on this card those blocks were 81% of the body.
A verification run of the billing-API task on the JSON bodies landed at the same session size (89,387 against 88,915) with a strictly richer correct answer:
the agent reinvested the cheaper cards into fourteen component spot-checks and additionally verified the auth scheme, a `readOnly` currency, and the prose-only defaults (`autopay`, the customer's default payment instrument) — the facts that live in descriptions survive the serialization change.

The component card that used to cost 7,871 B now answers with this, whole:

```
schemas/CurrencyCode · rebilly.yaml L1815-1821 — Currency code in ISO 4217 format.
signature: string
--- json
{"type":"string","description":"Currency code in ISO 4217 format.","minLength":3,"maxLength":3,"example":"USD","x-label":"omitted (L1820-1820)","x-sortable":"omitted (L1821-1821)"}
usedBy: 40 (--used-by)
```

And the operation card's shape — header line, one line of body JSON with the vendor blocks folded to coordinate markers, then the dependency signatures.
Shortened here by eliding with `…`; nothing is rewritten:

```
post /subscriptions · PostSubscription · rebilly.yaml L32632-32781 · tags: Orders — Create an order
--- json
{"x-products":"omitted (L32632-32633)","tags":["Orders"],"summary":"Create an order","operationId":"PostSubscription","x-sdk-operation-name":"omitted (L32638-32638)","description":"Creates an order.\n\nTo create or update an order with a specified ID, use the [Upsert an order](../PutSubscription) operation.","parameters":[{"$ref":"#/components/parameters/subscriptionExpand"}],"requestBody":{"$ref":"#/components/requestBodies/Subscription"},"responses":{…},"x-codeSamples":"omitted (L32665-32781)"}
--- deps (12, signatures depth ≤2, truncated at 64 KB)
headers/Location L595-599: Location of the related resource.
parameters/subscriptionExpand L448-474: Expand a response to receive a full related object in the `_embedded` path. To expand multiple objects, use a comma-separated list. Example:…
requestBodies/Subscription L20471-20476: Order resource.
responses/Forbidden L20113-20117: Access forbidden.
schemas/SubscriptionOrOneTimeSale L16039-16048: [oneOf: Subscription, OneTimeSale, discriminator: orderType]
…
```

The `x-codeSamples` marker in that body is 117 lines of PHP examples the first-round card shipped verbatim; the coordinates recover them with a `Read` or `--format=json` when they are actually wanted.

## Three descriptions, head to head

The isolated head-to-heads — one multi-step task per description, same model, fresh sessions.
The no-tool controls are barred from OpenAPI tooling and repository instructions, and are shared across rounds since nothing about their conditions changed.
Every answer on every tab was correct.

{% tabs %}
{% tab label="GitHub REST · 10.0 MB" %}

**Task:** publish a release, upload a zip asset to it, delete the asset — hosts, required fields, and the data link between each step.
**The trap:** the upload operation overrides the server to `https://uploads.github.com` at the operation level; everything else lives on `api.github.com`.

| Run                | Session | Output tokens | Actions |
| ------------------ | ------: | ------------: | ------: |
| No tool            |  66,246 |        19,789 |      20 |
| `ai`, first round  |  95,754 |        19,885 |      18 |
| `ai`, final format |  66,862 |    **16,952** |      19 |

The final-format agent never listed a tag: overview (1.1 KB) → `--find "release"` → `--find "upload asset"` (0.3 KB) → three operation cards with deps → component spot-checks.
The first-round agent had to page a 37 KB tag listing through `head -c` instead; that step is what `--find` deleted.
Both indexed agents and the control caught the host override.
Result: parity with the control on session size (+0.9%) with the lowest output tokens of the series.

{% /tab %}
{% tab label="Billing API · 1.3 MB" %}

**Task:** create a product, create a recurring-billing plan for it, then subscribe an existing customer — required fields with types, success codes, and what feeds each next request.
**The traps:** `Plan` is an `anyOf` of three variants with no discriminator (the recurring one is `SubscriptionPlan`, distinguished only by its fields), and the subscription operation lives under the `Orders` tag with summary "Create an order".

| Run                |    Session | Output tokens | Actions |
| ------------------ | ---------: | ------------: | ------: |
| No tool            |     92,648 |        31,052 |      42 |
| `ai`, first round  |    121,543 |        22,659 |      22 |
| `ai`, final format | **88,915** |    **22,554** |      26 |

The final-format run is the first time the indexed agent finished below the no-tool control on session size, output tokens, and wall clock (415 s against 437 s) at once.
Its chain: overview → `--find "subscription"` → three small tag listings (3–5 KB each) → four cards → component checks.
Where the first round's agent could not confirm `PlanFormulaFlatRate`'s fields — the old component card carried no body — the final-format agent confirmed them from the card's signature line in one call.
A follow-up verification run on the JSON card bodies landed at the same session size (89,387) with a strictly richer answer: the auth scheme, a `readOnly` currency, and the prose-only defaults, verified through fourteen extra component spot-checks.

{% /tab %}
{% tab label="Demo API · 41 KB" %}

**Task:** find a coffee item on the menu, create an order for it, then check that order's status — including where the OAuth2 token comes from.
**The wrinkle:** ordering requires an `orders:write` bearer token, but the menu is public (`security: []`), and the token endpoint is declared only inside the security scheme, not as a documented operation.

| Run                |    Session | Output tokens | Actions |
| ------------------ | ---------: | ------------: | ------: |
| No tool            |     71,430 |    **12,821** |       3 |
| `ai`, first round  | **67,842** |        14,130 |      18 |
| `ai`, final format |     74,020 |        35,364 |      23 |

On a 9,042-token description the control simply read the whole file in one call — the cheapest possible session.
The final-format agent cost more than either baseline and spent 23 calls (four of them `--find`) producing the most detailed answer of the series:
the full OAuth2 register-then-token chain, the `search`/`filter` query parameters, id patterns, and an honest note that the token endpoint is not a documented operation.
Below the context window, structure buys answer quality, not tokens — dump when the file fits.

{% /tab %}
{% /tabs %}

## The verdict

Is there an advantage? Yes — but not the one usually claimed, and the honest answer differs by question.

**On session tokens: parity to a small win.**
Against a capable text-search agent on the billing API the rebuilt format wins on everything at once — session −4%, output tokens −27%, wall clock included;
on the 10.0 MB description it reaches parity on session size with the lowest output tokens of the series;
on the 41 KB demo, pasting the file wins.
Before the rebuild the index _lost_ by 31–44%, so the honest reading is:
tokens are no longer an argument against the index, and on complex descriptions they lean slightly for it —
but both approaches retrieve 1–2% of the file, and the model's own reasoning dominates either session.

**The advantage lives in three measured places.**

1. **Determinism.** The impact question took the text-search agent 28 improvised probes; the protocol agent, 6 bounded calls, −36% session.
   Each action is a full context re-send, and no pipeline can rely on improvised probes; it can rely on the same 3–6 commands every time.
2. **Structured answers.** `--used-by` returns the transitive graph as data with `via` chains — consumable by a CI gate or an MCP tool.
   The text-search agent's equivalent was prose reconstructed by hand.
3. **Reinvestment.** When per-call prices dropped, the verification agent spent the savings on fourteen extra spot-checks and a strictly richer correct answer at the same session size.
   Cheap retrieval converts into verification depth, not just into a smaller bill.

**Where there is no advantage, stated plainly:**
a familiar public API, a one-off task, and a capable text-search agent is a fair fight that ends near parity;
and a description that fits comfortably in the window is cheapest pasted whole.
The index's case is everything else:
descriptions past the window, private or unfamiliar APIs where there is nothing to guess search words from,
impact questions, and any flow that has to run more than once.

## Methodology notes

- Every output above comes from a real command run against the real file; sizes are the byte counts of captured `stdout`.
- Token counts come from `gpt-tokenizer` over the exact captured text, not from a characters-per-token estimate.
- Captured samples are real command output, shortened only by dropping whole nodes and eliding with `…`, never by rewriting values; the file name is shortened from the local path to `api.github.com.yaml`.
- The description is `api.github.com.yaml` from the `main` branch of `github/rest-api-description`, version 1.1.4, fetched 2026-08-06, used unmodified.
- The agent chooses which nodes to open; the command syntax comes from the instruction counted separately above.
- The re-measured round's runs are isolated: the descriptions live in a directory outside this repository, and the no-tool controls are explicitly barred from running OpenAPI tooling or reading repository instructions.
  That bar exists because the first isolation attempt failed — two of three control agents discovered `tree` on their own through the repository's `AGENTS.md` and used it; those contaminated controls were discarded and re-run.
- A session number is the agent's final context size, not the billed total: every turn re-sends the context, so the billed cache reads on the billing-API runs were 4.1–4.4 M tokens.
  The Actions column is therefore not decorative — fewer turns means fewer full context passes.
- The re-measured round's CLI build also carried a then-pending fix for a one-line overshoot in raw-content slicing; it affects card bodies only and none of the sizes in the price list above.
- Each command invocation analyzes the description again, at a near-constant cost after two performance fixes (a per-analysis reverse index and a binary-searched line-offset table):
  the overview, a `--with-deps` card, the 203-entry tag listing, the full 1,216-entry operations listing, and the 967-entry schemas listing each take about 2.6–3 seconds on the 10.0 MB file — down from 38 seconds to 3.5 minutes before the fixes.
  A long-running process that keeps the analysis in memory would pay even that remaining per-invocation cost once per session instead of once per step.
