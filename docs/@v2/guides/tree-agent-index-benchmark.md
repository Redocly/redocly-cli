# How much context the `tree` index saves an agent

The [`tree`](../commands/tree.md) command's JSON index lets an AI agent work with an API description that does not fit in its context window.
This guide measures that on the largest well-known public API description: GitHub's official REST API description, 10.0 MB of OpenAPI.
For the command reference, see [`tree`](../commands/tree.md).

Every number below comes from a real command run against that file, tokenized with a BPE tokenizer (`gpt-tokenizer`, o200k family; other model families tokenize slightly differently, with the same order of magnitude).
The description is public, so the whole experiment is reproducible:

```bash
curl -O https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.yaml
```

## The setup

- **Description:** `api.github.com.yaml` from [`github/rest-api-description`](https://github.com/github/rest-api-description) — 10.0 MB (9,984,314 bytes), OpenAPI 3.0.3, 47 tags, 1,216 operations, 0 webhooks, 1,766 components.
  This is the first-party description GitHub's own SDKs are generated from, not a conversion or a sample.
- **Agent task:** _"Create a repository for the authenticated user."_
- **Agent constraints:** a 200,000-token context window; the agent starts knowing nothing about the description.
- **What the agent is told up front:** a short instruction naming the three commands (overview → tag → operation-with-deps) — **85 tokens**, measured:

  > This API description is too large to read directly. Get an overview with `redocly tree <file> --format=json`. List one tag's operations with `redocly tree <file> --tag=<tag> --format=json`. Fetch one operation's source and full dependency closure with `redocly tree <file> --path=<path> --operation=<method> --with-deps --format=json`.

  The agent decides _which_ tag and operation to open by reasoning over the names and summaries it sees in the responses; the instruction above is all it needs to know about the commands themselves.
  That one-time cost is about 0.2% of the chain below and appears as a separate line in the totals.

## Without the index

The agent's only option is to read the description:

| Input                             |        Tokens |
| --------------------------------- | ------------: |
| `api.github.com.yaml`, whole file | **1,946,549** |

At 1,946,549 tokens the file is roughly ten times a 200,000-token window, and still twice a 1,000,000-token one.
No amount of "read a bit more" helps here.
Searching the file by text instead is unreliable: it does not reveal the structure, does not follow `$ref` chains, and gives no bound on how much context the agent ends up reading.

## Why the index has to be hierarchical

The command surface has no command that dumps the whole structure — tags, operations, and components — in one call.
The closest thing is `--operations`, the flattest listing available, which returns every operation in the description at once; each entry is card-shaped — coordinates plus its typed one-hop `refs` and `usedBy` — not just a coordinate line, so this costs far more than the operation count alone suggests:

| Input                                                         |      Tokens | Operations |
| ------------------------------------------------------------- | ----------: | ---------: |
| `redocly tree api.github.com.yaml --operations --format=json` | **771,279** |      1,216 |

That no longer fits inside a 200,000-token window at all — it needs four of them — and it still leaves the agent with 1,216 operations to read through, plus none of the description's 1,766 components: there is no flat listing for those at all, since `--component` always scopes to one section, and `--with-deps` resolves one component's closure at a time.
The largest single section makes the same point on its own — `--component=schemas --format=json` returns the description's 967 schemas, card-shaped the same way, for **625,136** tokens, over three windows by itself:

| Input                                                                |      Tokens | Components |
| -------------------------------------------------------------------- | ----------: | ---------: |
| `redocly tree api.github.com.yaml --component=schemas --format=json` | **625,136** |        967 |

Walking the hierarchy instead — the map, one tag, then one operation — costs 149,667 tokens end to end (+85 instruction, measured below): under a fifth of the flat operations listing, under a quarter of the schemas listing, and still leaves a quarter of the window free for the rest of the task.
The selector flags (`--tag`, `--path`, `--operation`, `--component`) are what make that possible: the agent never asks for more than one branch at a time, so the hierarchy — enforced by the commands themselves, not by a size warning — is what keeps every step bounded, even though each step now carries more than bare coordinates.

## With the index

The agent walks the hierarchy in bounded steps, paying only for the path it chooses:

| Step                                             | Command                                                                                          | Output size |      Tokens |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ----------: | ----------: |
| 1. Map the spec — 47 tags                        | `redocly tree api.github.com.yaml --format=json`                                                 |      6.7 KB |       1,777 |
| 2. Open the branch it picked — 203 operations    | `redocly tree api.github.com.yaml --tag=repos --format=json`                                     |    484.6 KB |     128,288 |
| 3. Fetch the target with its full `$ref` closure | `redocly tree api.github.com.yaml --path=/user/repos --operation=post --with-deps --format=json` |     82.9 KB |      19,517 |
| **Total**                                        |                                                                                                  |             | **149,582** |

Step 3 returns a _self-contained_ slice: the operation's raw source (8.1 KB) plus the 14 components it transitively references — the `full-repository` schema, six documented error responses, the response example, and the schemas underneath them — in dependency order, filling 62.9 KB of the 64 KB closure cap.
One more schema (`schemas/nullable-simple-user`, reached through `full-repository`) would have pushed the closure past the cap, so the envelope comes back with `truncated: true`: that schema stays one selector call away.

The most expensive step is not the largest file, it is the largest branch: `repos` is GitHub's biggest tag, and listing its 203 operations costs over six times more tokens than fetching the target operation and its entire dependency closure combined — because every one of those 203 entries now carries its own one-hop `refs` and `usedBy`, not just a coordinate line.

## What the agent actually sees

Step 1 is small enough to show nearly in full — this is most of the map of a 10.0 MB API in 1,777 tokens (some of the 47 tags are dropped here for length, marked below; none of the shown values are edited):

```json
{
  "docName": "api.github.com.yaml",
  "spec": "oas3_0",
  "docDescription": "GitHub v3 REST API — GitHub's v3 REST API.",
  "overview": {
    "pointer": "#/info",
    "file": "api.github.com.yaml",
    "start_line": 4,
    "end_line": 14,
    "summary": "GitHub's v3 REST API."
  },
  "servers": {
    "pointer": "#/servers",
    "file": "api.github.com.yaml",
    "start_line": 116,
    "end_line": 116,
    "urls": ["https://api.github.com"]
  },
  "tags": [
    {
      "name": "actions",
      "summary": "Endpoints to manage GitHub Actions using the REST API.",
      "operations": 187
    },
    {
      "name": "activity",
      "summary": "Activity APIs provide access to notifications, subscriptions, and timelines.",
      "operations": 32
    },
    {
      "name": "apps",
      "summary": "Information for integrations and installations.",
      "operations": 37
    },
    "… 42 more tags …",
    { "name": "repos", "summary": "Interact with GitHub Repos.", "operations": 203 },
    { "name": "search", "summary": "Search for specific items on GitHub.", "operations": 7 }
  ],
  "operations": 1216,
  "webhooks": [],
  "components": [
    { "section": "schemas", "count": 967 },
    { "section": "responses", "count": 49 },
    { "section": "parameters", "count": 208 },
    { "section": "headers", "count": 7 },
    { "section": "examples", "count": 535 }
  ]
}
```

Step 2 opens the `repos` branch and returns its operations as a flat list, one entry per operation.
Each entry is card-shaped: the summary, description, and exact lines the agent could read directly, plus its own typed one-hop `refs` and `usedBy` — the same fields a single operation card carries, so the agent often has what it needs without a third call.
That per-entry `refs`/`usedBy` is also why this step now costs what it does: the real output has 203 such entries; this is the one the agent needs next:

```json
{
  "method": "post",
  "path": "/user/repos",
  "operationId": "repos/create-for-authenticated-user",
  "summary": "Create a repository for the authenticated user",
  "tags": ["repos"],
  "pointer": "#/paths/~1user~1repos/post",
  "file": "api.github.com.yaml",
  "start_line": 62540,
  "end_line": 62746,
  "description": "Creates a new repository for the authenticated user. OAuth app tokens and personal access tokens (classic) need the `public_repo` or `repo` scope to create a…",
  "refs": [
    {
      "ref": "#/components/examples/full-repository",
      "resolved": true,
      "file": "api.github.com.yaml",
      "pointer": "#/components/examples/full-repository",
      "start_line": 239500,
      "end_line": 239995,
      "component": "examples",
      "name": "full-repository"
    },
    {
      "ref": "#/components/responses/bad_request",
      "resolved": true,
      "file": "api.github.com.yaml",
      "pointer": "#/components/responses/bad_request",
      "start_line": 260773,
      "end_line": 260780,
      "component": "responses",
      "name": "bad_request"
    },
    "… 6 more one-hop refs …"
  ],
  "usedBy": []
}
```

This entry's `refs` are the same eight one-hop references step 3 resolves into a full closure below; a listing entry stops at one hop and coordinates, a card (or `--with-deps`) goes deeper.

Step 3 returns the operation card: raw source lines, the `$ref`s found inside them resolved to real locations, and the transitive closure under `deps`:

```json
{
  "method": "post",
  "path": "/user/repos",
  "operationId": "repos/create-for-authenticated-user",
  "summary": "Create a repository for the authenticated user",
  "tags": ["repos"],
  "pointer": "#/paths/~1user~1repos/post",
  "file": "api.github.com.yaml",
  "start_line": 62540,
  "end_line": 62746,
  "description": "Creates a new repository for the authenticated user. OAuth app tokens and personal access tokens (classic) need the `public_repo` or `repo` scope to create a…",
  "refs": [
    {
      "ref": "#/components/examples/full-repository",
      "resolved": true,
      "file": "api.github.com.yaml",
      "pointer": "#/components/examples/full-repository",
      "start_line": 239500,
      "end_line": 239995,
      "component": "examples",
      "name": "full-repository"
    },
    {
      "ref": "#/components/responses/bad_request",
      "resolved": true,
      "file": "api.github.com.yaml",
      "pointer": "#/components/responses/bad_request",
      "start_line": 260773,
      "end_line": 260780,
      "component": "responses",
      "name": "bad_request"
    },
    "… 6 more one-hop refs …"
  ],
  "usedBy": [],
  "content": "…",
  "deps": [
    {
      "id": "responses/bad_request",
      "pointer": "#/components/responses/bad_request",
      "file": "api.github.com.yaml",
      "start_line": 260773,
      "end_line": 260780,
      "content": "…",
      "refs": [
        {
          "ref": "#/components/schemas/basic-error",
          "resolved": true,
          "file": "api.github.com.yaml",
          "pointer": "#/components/schemas/basic-error",
          "start_line": 85731,
          "end_line": 85742
        },
        {
          "ref": "#/components/schemas/scim-error",
          "resolved": true,
          "file": "api.github.com.yaml",
          "pointer": "#/components/schemas/scim-error",
          "start_line": 86026,
          "end_line": 86047
        }
      ]
    },
    {
      "id": "schemas/full-repository",
      "pointer": "#/components/schemas/full-repository",
      "file": "api.github.com.yaml",
      "start_line": 99720,
      "end_line": 100203,
      "content": "…",
      "refs": [
        {
          "ref": "#/components/schemas/nullable-repository",
          "resolved": true,
          "file": "api.github.com.yaml",
          "pointer": "#/components/schemas/nullable-repository",
          "start_line": 99113,
          "end_line": 99693
        },
        "… 3 more one-hop refs …"
      ]
    },
    "… 12 more deps …"
  ],
  "truncated": true
}
```

The `content` values above are elided (`…`); the real output carries the actual raw source lines for the operation and for every dependency.
The 14 ids returned in the closure: `examples/full-repository`, `responses/bad_request`, `responses/forbidden`, `responses/not_found`, `responses/not_modified`, `responses/requires_authentication`, `responses/validation_failed`, `schemas/full-repository`, `schemas/basic-error`, `schemas/scim-error`, `schemas/validation-error`, `schemas/code-of-conduct-simple`, `schemas/nullable-license-simple`, and `schemas/nullable-repository`.

`--format=stylish` (the default) renders the same content and dependency closure as a tree instead of raw JSON — an agent working from `--format=json` still wants the machine shape shown above, since that is what its own instruction and reasoning loop expect.

## The same task on a split (multi-file) layout

The same description was run through [`redocly split`](../commands/split.md), producing **2,842 files**, and the identical chain was repeated against `openapi.yaml` in that directory:

| Step                                                 | Single file | Split (2,842 files) |
| ---------------------------------------------------- | ----------: | ------------------: |
| 1. `--format=json`                                   |       1,777 |               1,685 |
| 2. `--tag=repos`                                     |     128,288 |             119,045 |
| 3. `--path=/user/repos --operation=post --with-deps` |      19,517 |              19,146 |
| **Chain total**                                      | **149,582** |         **139,876** |

The split chain is still cheaper, because pointers inside small files are short — but the gap is proportionally smaller than it used to be: the dominant cost in step 2 is now each entry's `refs`/`usedBy`, and those don't shrink with pointer length the way the old coordinate-only entries did.
Both layouts list the same 203 operations under `repos`, and operation ids are identical (`POST /user/repos`), so the same agent instructions work unchanged.
The selector also resolves the same way in both layouts: `--path=/user/repos --operation=post` and the operationId form `--operation=repos/create-for-authenticated-user` return byte-identical cards on the split description, with no fallback needed — operation addressing does not depend on a root registry.

Component ids differ between the layouts, and it is worth knowing why.
In the single file, components are declared under `components`, so they get canonical ids: `schemas/full-repository`.
`redocly split` does not keep a component registry in the root document — path files reference component files directly — so in that layout the same schema is identified by its path: `components/schemas/full-repository.yaml`.
Canonical ids appear in a split layout too, as long as the root document declares the component (`components: {schemas: {Name: {$ref: ./file.yaml}}}`), which is what a hand-maintained multi-file description usually does.
Either way the closure is retrieved by one command: here it pulled 15 components from 15 separate files, one more than the single-file closure (`schemas/nullable-simple-user`, which fits under the split layout's smaller per-reference overhead), and returned them as a single envelope — the case where an agent without an index would have to hand-walk `$ref`s across a 2,842-file tree without knowing which ones matter.

## The difference

|                                 |                    Tokens |                                                                                  vs. whole file |
| ------------------------------- | ------------------------: | ----------------------------------------------------------------------------------------------: |
| Whole file                      |                 1,946,549 |                                                                                — (does not fit) |
| Flat `--operations` listing     |                   771,279 | **~2.5× less** (doesn't fit a 200k window either — needs four of them, and still no components) |
| Index chain                     | 149,582 (+85 instruction) |                                                                                   **~13× less** |
| Index chain on the split layout | 139,876 (+85 instruction) |                                                                                   **~14× less** |

The ratio matters less than the shape of the curve.
The chain's cost is bounded by the _largest branch_ and the _deepest single closure_, not by the size of the description, or even by how it's stored: the whole-file and split layouts above describe the exact same API, one as a single 10.0 MB file and the other as 2,842 small ones, and their chains land within 7% of each other (149,667 vs 139,961 tokens including the instruction) — because both walk the same `repos` branch and resolve the same closure, just from files of different shapes.

For descriptions that fit the context window, the index saves tokens.
Past the window size, it is the difference between an impossible task and a routine one — here the agent solves a task against a two-million-token API while using about three-quarters of a 200,000-token window, with a quarter left for the work itself.
That is a smaller margin than the index used to leave: card-shaped listings buy the agent one-hop `refs`/`usedBy` on every entry without a second call, at the cost of a bigger single step whenever the branch it opens is a large one.

## A live agent run

Everything above is measured by hand: the chain a well-instructed agent _would_ run, priced step by step.
To check that against reality, the same experiment was run live: a Claude Sonnet agent received ONLY the 85-token instruction from the setup section, the task ("determine how to create a repository for the authenticated user: method, path, required body fields, success status code"), and the file path — no strategy hints, no command sequence, and a hard rule that the YAML itself may not be opened.

What it did, unprompted:

1. It chose exactly the documented three-step chain — `--format=json`, then `--tag=repos --format=json`, then `--path=/user/repos --operation=post --with-deps --format=json` — in that order, with no extra or wasted calls.
2. It answered correctly: `POST /user/repos` (`repos/create-for-authenticated-user`), one required body field (`name`, string), success `201` returning `full-repository`.
3. The full outputs of the commands it chose re-measured within ~1% of the table above: 1,780 + 129,719 + 19,555 = **151,054 tokens** (vs. the table's 149,582 — run-to-run capture drift, same commands).
4. It did NOT swallow those outputs whole: on its own initiative it piped the two large steps through `head`, reading roughly 5,000 tokens of the 129,719-token `repos` listing and still finding its target.
   The whole live session — prompt, reasoning, and every tool output it actually read — cost **91,463 tokens**, under half the hand-computed chain.

Two honest caveats: this is a single run with a single model, and the instruction itself names the three commands — the agent's job was to pick targets and interpret results, not to invent the protocol.
But that is exactly the deployment model this guide prices: the chain total above is an upper bound on what a compliant agent consumes, and a real one lands under it.

### Multi-operation workflows

Real agent tasks usually chain several calls, so the live experiment was repeated with workflow tasks — same rules, same 85-token instruction, the agent picks every command itself.

**Against this 10.0 MB description** — task: "create a repository, open an issue in it, comment on that issue; state which response field feeds each next request."
The agent ran six commands (overview, the `repos` and `issues` branches, three operation cards), produced the correct three-call sequence, and wired the data flow correctly on the first try: `owner.login`/`name` from the create-repository response feed the `{owner}`/`{repo}` path parameters, and the issue response's `number` feeds `{issue_number}`.

| Task size    | Commands | Full outputs (tokens) | vs. whole file | Live session actually consumed |
| ------------ | -------: | --------------------: | -------------: | -----------------------------: |
| 1 operation  |        3 |               151,054 |      ~13× less |                         91,463 |
| 3 operations |        6 |               224,324 |     ~8.7× less |                         99,848 |

Tripling the task grew the chain by half, not by three: the overview is paid once, tag branches are reused across operations that share them, and each extra operation adds one card (~8-20k) plus at most one new branch.

**Against a small description** (the 41 KB, 9,042-token demo API) — task: "find a coffee product, order it, fetch the order's result."
The agent again composed the correct end-to-end sequence — `GET /menu` → `POST /orders` (menu item `id` → `orderItems[].menuItemId`) → `GET /orders/{orderId}` (order `id` → path parameter) — and, unprompted, also resolved the auth story: the menu is public, ordering needs an OAuth2 bearer with `orders:write`, and client credentials come from `POST /oauth2/register`.
The honest number: its eight commands' full outputs total 22,508 tokens — two and a half times the whole 9,042-token file.
On descriptions that fit the window comfortably, the index buys navigation and structure, not token savings; the savings argument starts where the file stops fitting.

## Methodology notes

- Every output above comes from a real command run against the real file; sizes are the byte counts of captured `stdout`.
- Token counts come from `gpt-tokenizer` over the exact captured text, not from a characters-per-token estimate.
- The JSON samples are real command output, shortened by dropping whole nodes and eliding long string values with `…`, never by rewriting values; the file name is shortened from the local path to `api.github.com.yaml`.
- The description is `api.github.com.yaml` from the `main` branch of `github/rest-api-description`, version 1.1.4, fetched 2026-08-06, used unmodified.
  The version field is unchanged since the previous measurement of this guide, but the file itself grew by 182,579 bytes (1.9%) over the same window, since `main` moves independently of the version field.
- The agent chooses which nodes to open; the command syntax comes from the 85-token instruction counted separately above.
- Each command invocation analyzes the description again.
  Building every entry's `refs`/`usedBy` now looks up a per-analysis index instead of re-scanning the graph, and turning a character offset into a line/column now binary-searches a per-analysis line-offset table instead of rescanning the source from character 0; both were previously redone on every single call.
  The overview step took about 2.7 seconds for this 10.0 MB file; a `--with-deps` card, which still walks the full `$ref` graph to build the dependency closure regardless of how small the output is, took about 3 seconds, down from about 47.
  The `--tag=repos` step (203 entries) took about 2.6 seconds, down from about 38; the full `--operations` listing (1,216 entries) took about 2.7 seconds, down from about 3.5 minutes; and `--component=schemas` (967 entries) took about 2.7 seconds, down from about 1.5 minutes.
  Every one of these now costs close to the same amount — the one-time cost of analyzing the 10.0 MB file — instead of growing with how many entries or dependencies the step touches.
  A long-running process that keeps the analysis in memory would pay even that remaining per-invocation cost once per session instead of once per step.
