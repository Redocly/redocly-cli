# What an agent gets wrong without an index, measured

The [first benchmark](./tree-agent-index-benchmark.md) asked an agent to name the calls a task needs and measured what that cost.
This one asks for something a developer could act on — a working flow, with the order of calls, what each one needs, and what carries over — and then checks whether the flow would actually run.
That second half is the point: a run that skips the token call is cheap and useless, and the first benchmark had no way to tell it apart from a good one.

Three descriptions, four models, two conditions, three runs each: 72 runs.

- **no tree** — the task and the path to the file. Neither `tree` nor Redocly is named.
- **tree** — the same task plus one line: the CLI is installed, and `tree --format=ai <flags>` makes searching the description easier. No flags are listed and no documentation is linked.

## What "working" means

Each description has an expected flow, taken from the description itself. A run passes when its answer contains every required call, sends it to the right host, names the fields the request body requires, and names the scheme that protects the operations.

| Description          | Expected flow                                                                                                         | The part that catches people out                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Cafe API, 41 KB      | `POST /oauth2/token` → `GET /menu` → `POST /orders` → `GET /orders/{orderId}`                                         | `/orders` and the status check need OAuth2 scopes, so a flow without the token call returns 401 twice                     |
| Billing API, 1.3 MB  | `POST /products` → `POST /plans` → `POST /subscriptions`                                                              | the subscription needs `orderType`, `customerId`, `websiteId` and `items`, and every call needs the `SecretApiKey` header |
| GitHub REST, 10.0 MB | `POST /app/installations/{id}/access_tokens` → `POST /releases` → asset upload → `DELETE /releases/assets/{asset_id}` | the upload overrides its server to `https://uploads.github.com`, and the delete is keyed by asset, not release            |

## How often the flow worked

| Description | Model     | no tree | tree |
| ----------- | --------- | ------: | ---: |
| Cafe API    | Opus 5    |     3/3 |  3/3 |
| Cafe API    | Sonnet 5  |     3/3 |  3/3 |
| Cafe API    | Fable 5   |     3/3 |  3/3 |
| Cafe API    | Haiku 4.5 |     0/3 |  1/3 |
| Billing API | Opus 5    |     3/3 |  3/3 |
| Billing API | Sonnet 5  |     0/3 |  1/3 |
| Billing API | Fable 5   |     3/3 |  3/3 |
| Billing API | Haiku 4.5 |     0/3 |  0/3 |
| GitHub REST | Opus 5    |     3/3 |  2/3 |
| GitHub REST | Sonnet 5  |     2/3 |  1/3 |
| GitHub REST | Fable 5   |     1/3 |  2/3 |
| GitHub REST | Haiku 4.5 |     0/3 |  1/3 |

Forty-four of 72 runs produced a flow that would run.
Four cells never produced one without the index and did with it — the Cafe and GitHub tasks on Haiku 4.5, the billing task on Sonnet 5 — while no cell went the other way.

## What it cost when it worked

Runs that failed the check are excluded: comparing the price of an answer that does not work rewards leaving things out.
Context is what the run added to its own session; calls are tool calls; the price is what the CLI reported.

| Description | Model     | no tree             | tree                | Context |
| ----------- | --------- | ------------------- | ------------------- | ------: |
| Cafe API    | Opus 5    | 16,769 / 1 · $0.41  | 17,103 / 11 · $0.58 |     +2% |
| Cafe API    | Sonnet 5  | 18,287 / 2 · $0.27  | 8,474 / 5 · $0.26   |    −54% |
| Cafe API    | Fable 5   | 16,882 / 1 · $0.72  | 9,889 / 9 · $0.82   |    −41% |
| Cafe API    | Haiku 4.5 | no working answer   | 7,604 / 8 · $0.09   |       — |
| Billing API | Opus 5    | 35,212 / 32 · $1.56 | 32,019 / 21 · $1.00 |     −9% |
| Billing API | Sonnet 5  | no working answer   | 28,164 / 13 · $0.55 |       — |
| Billing API | Fable 5   | 32,043 / 30 · $2.82 | 18,329 / 11 · $1.32 |    −43% |
| Billing API | Haiku 4.5 | no working answer   | no working answer   |       — |
| GitHub REST | Opus 5    | 16,462 / 13 · $0.72 | 16,284 / 11 · $0.67 |     −1% |
| GitHub REST | Sonnet 5  | 15,620 / 16 · $0.46 | 11,604 / 5 · $0.27  |    −26% |
| GitHub REST | Fable 5   | 15,145 / 13 · $1.09 | 11,932 / 10 · $0.85 |    −21% |
| GitHub REST | Haiku 4.5 | no working answer   | 8,565 / 6 · $0.08   |       — |

Where both sides produced a working flow, the index is cheaper in six of eight cells, by 1% to 54%, and the price follows.
Tool calls drop on the two large descriptions — 21 against 32 on the billing API, 5 against 16 on GitHub — and rise on the 41 KB Cafe API, where the alternative is a single read of the whole file.

## What the failures were

| Reason                                                                              | Runs |
| ----------------------------------------------------------------------------------- | ---: |
| the `SecretApiKey` header is never named, so no billing call would authenticate     |   11 |
| the asset upload is missing, so nothing is attached to the release                  |    8 |
| `POST /products` is missing, so the plan has nothing to sell                        |    6 |
| no call to mint the GitHub App installation token, though the flow says it uses one |    5 |
| no `POST /oauth2/token`, so the cafe order and its status return 401                |    4 |
| `POST /plans` is missing                                                            |    2 |
| no `GET /orders/{orderId}`; that run substituted the operator's order list          |    1 |
| the asset delete is missing                                                         |    1 |

The pattern is consistent: what gets dropped is the step that is not part of the obvious happy path — the token, the upload host, the field that lives two `$ref`s away.
On the Cafe API, where the whole description fits in one read, both conditions find those. On the two large ones, a search that stops at the first plausible hit does not.

## How this was measured

Every run is a fresh Claude Code session started from the command line with the task text as its only input, allowed to run shell commands, read files and search them.
Sessions start in an empty directory with the description outside any repository, so no `AGENTS.md` or `CLAUDE.md` reaches the model; the tree runs call a published `@redocly/cli` snapshot.

**context** — from the run's transcript, over the `assistant` records that carry a `message.usage`.
A turn's context is `input_tokens + cache_read_input_tokens + cache_creation_input_tokens`, and the table gives the last turn's minus the first turn's, so the fixed opening cost — the system prompt plus the task, identical in both conditions — drops out.

**cost** — `total_cost_usd` as the run itself reports it. Prices differ per model, so amounts compare across a row, not down a column; a warm prompt cache can move a single run by half.

**working** — the answer is parsed for its calls and compared with the expected flow above. The check is deliberately blunt: it accepts any JSON shape and any equivalent phrasing of a host or scheme, and only reports a required call, host, field or scheme that is nowhere in the answer.

Cells report the median of three runs.
Repeats vary more without the index than with it, and a difference under about 15% of context is a tie.
