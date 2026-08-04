# How much context the `tree` index saves an agent

The [`tree`](../commands/tree.md) command's JSON index lets an AI agent work with an API description that does not fit in its context window.
This guide measures what that saves on three real descriptions — from a 1.3 MB production API to the 9.8 MB GitHub REST API — and shows what the agent sees at each step.
For the command reference, see [`tree`](../commands/tree.md).

All numbers are actual counts from real command output, tokenized with a BPE tokenizer (`gpt-tokenizer`, o200k family; other model families tokenize slightly differently, with the same order of magnitude).
The main walkthrough uses a production description anonymized as `test.yaml`; the scaling section at the end repeats the experiment on two public descriptions, named openly.

## The setup

- **Description:** `test.yaml` — 1.3 MB, OpenAPI 3.x, ~130 tags, hundreds of operations, deep shared schemas.
- **Agent task:** _"Generate a typed client call for `GET /customers/{id}`."_
- **Agent constraints:** a 200k-token context window; the agent starts knowing nothing about the description.
- **What the agent is told up front:** a short instruction naming the three commands (index → branch → leaf-with-deps) and the id forms — **114 tokens**, measured. The agent decides _which_ branch and operation to open by reasoning over titles and summaries; it does not discover the commands themselves. That one-time cost is about 1% of any chain below and appears as a separate line in the totals.

## Without the index

The agent's only option is to read the description:

| Input                   |      Tokens |
| ----------------------- | ----------: |
| `test.yaml`, whole file | **267,739** |

At 267,739 tokens the file does not fit into the 200,000-token window, so reading it whole is not an option.
Searching the file by text instead is unreliable: it does not reveal the structure, does not follow `$ref` chains across files, and gives no bound on how much context the agent ends up reading.

## With the index

The agent walks the hierarchy in bounded steps, paying only for the path it chooses:

| Step                                             | Command                                                           | Output size |     Tokens |
| ------------------------------------------------ | ----------------------------------------------------------------- | ----------: | ---------: |
| 1. Map the spec                                  | `redocly tree test.yaml --format=json --level 2`                  |       53 KB |     12,652 |
| 2. Open the branch it picked                     | `redocly tree test.yaml --node Customers`                         |      5.5 KB |      1,407 |
| 3. Fetch the target with its full `$ref` closure | `redocly tree test.yaml --node 'GET /customers/{id}' --with-deps` |     43.5 KB |     10,508 |
| **Total**                                        |                                                                   |             | **24,567** |

Step 3 returns a _self-contained_ slice: the operation's raw source lines plus all 31 schemas it transitively references, in dependency order — everything needed to write the client call, nothing else.
The 64 KB closure cap was not even reached.

A leaner variant, when the task text already names the area (an agent can guess the `Customers` branch from step 1's section list alone):

| Step                   | Command                                    |     Tokens |
| ---------------------- | ------------------------------------------ | ---------: |
| 1. Sections only       | `--format=json --level 1`                  |        429 |
| 2. Branch              | `--node Customers`                         |      1,407 |
| 3. Target with closure | `--node 'GET /customers/{id}' --with-deps` |     10,508 |
| **Total**              |                                            | **12,344** |

## What the index actually looks like

Step 1 on the 1.3 MB spec — the whole map of the API in 429 tokens:

```json
{
  "docName": "test.yaml",
  "spec": "oas3_1",
  "docDescription": "Core APIs — The API is built on HTTP and is RESTful. It has predictable resource URLs…",
  "structure": [
    {
      "id": "Overview",
      "title": "Overview",
      "pointer": "#/info",
      "file": "test.yaml",
      "start_line": 3,
      "end_line": 162,
      "summary": "# Introduction … predictable resource URLs and returns HTTP response codes…"
    },
    {
      "id": "Servers",
      "title": "Servers",
      "pointer": "#/servers",
      "summary": "https://api-sandbox.example.com/…, https://api.example.com/…"
    },
    {
      "id": "Operations",
      "title": "Operations",
      "pointer": "#/paths",
      "start_line": 23126,
      "end_line": 38861
    },
    {
      "id": "Webhooks",
      "title": "Webhooks",
      "pointer": "#/webhooks",
      "start_line": 38863,
      "end_line": 40136
    },
    {
      "id": "Components",
      "title": "Components",
      "pointer": "#/components",
      "start_line": 192,
      "end_line": 21955
    }
  ]
}
```

Step 2 opens one branch — the tag the agent picked, with its operations:

```json
{
  "structure": [
    {
      "id": "Customers",
      "title": "Customers",
      "pointer": "#/tags/16",
      "file": "test.yaml",
      "start_line": 22205,
      "end_line": 22224,
      "summary": "Use these operations to manage customers. A customer is an entity that purchases goods or services…",
      "nodes": [
        {
          "id": "GET /customers",
          "title": "GET /customers — Retrieve customers",
          "operationId": "GetCustomerCollection",
          "pointer": "#/paths/~1customers/get",
          "file": "test.yaml",
          "start_line": 25755,
          "end_line": 25845,
          "summary": "Retrieve customers"
        },
        {
          "id": "GET /customers/{id}",
          "title": "GET /customers/{id} — Retrieve a customer",
          "operationId": "GetCustomer",
          "pointer": "#/paths/~1customers~1{id}/get",
          "file": "test.yaml",
          "start_line": 25990,
          "end_line": 26031,
          "summary": "Retrieve a customer"
        }
      ]
    }
  ]
}
```

Step 3 returns the leaf envelope: raw source lines, the `$ref`s found inside them resolved to real files, and the closure under `deps`:

```json
{
  "id": "GET /customers/{id}",
  "pointer": "#/get",
  "file": "paths/customers_{id}.yaml",
  "start_line": 4,
  "end_line": 42,
  "content": "  tags:\n    - Customers\n  summary: Retrieve a customer\n  operationId: GetCustomer\n  parameters:\n    - $ref: ../components/parameters/collectionExpand.yaml\n  responses:\n    '200':\n      content:\n        application/json:\n          schema:\n            $ref: ../components/schemas/Customer.yaml\n    '404':\n      $ref: ../components/responses/NotFound.yaml",
  "refs": [
    {
      "ref": "../components/schemas/Customer.yaml",
      "resolved": true,
      "file": "components/schemas/Customer.yaml",
      "pointer": "#/"
    },
    {
      "ref": "../components/responses/NotFound.yaml",
      "resolved": true,
      "file": "components/responses/NotFound.yaml",
      "pointer": "#/"
    }
  ],
  "deps": [
    { "id": "schemas/Customer", "file": "components/schemas/Customer.yaml", "content": "…" },
    { "id": "responses/NotFound", "file": "components/responses/NotFound.yaml", "content": "…" }
  ]
}
```

## The same task on a split (multi-file) layout

The same spec was run through `redocly split`, producing **1,002 files** (`paths/`, `components/`, `webhooks/`, `code_samples/`), and the identical chain was repeated against `openapi.yaml` in that directory:

| Step                                          | Single file | Split (1,002 files) |
| --------------------------------------------- | ----------: | ------------------: |
| 1. `--format=json --level 1`                  |         429 |                 417 |
| 2. `--node Customers`                         |       1,407 |               1,317 |
| 3. `--node 'GET /customers/{id}' --with-deps` |      10,508 |               8,823 |
| **Chain total**                               |  **12,344** |          **10,557** |

Two things to note.
Node ids are identical in both layouts (`GET /customers/{id}`, `schemas/Customer`), because components split into their own files keep their canonical `section/Name` ids — so the same agent instructions and the same commands work unchanged.
The split chain is slightly _cheaper_, since pointers inside small files are short.
The closure in step 3 pulled content from **34 distinct files** and returned them as one envelope — the case where an agent without an index would have to hand-walk `$ref`s across a thousand-file tree without knowing which ones matter.

## The difference

|                                 |                    Tokens |   vs. whole file |
| ------------------------------- | ------------------------: | ---------------: |
| Whole file                      |                   267,739 | — (does not fit) |
| Index chain, standard           | 24,567 (+114 instruction) |    **~11× less** |
| Index chain, lean               | 12,344 (+114 instruction) |    **~22× less** |
| Index chain on the split layout | 10,557 (+114 instruction) |    **~25× less** |

The ratio matters less than the shape of the curve.
The chain's cost is bounded by the _largest branch_ and the _deepest single closure_, not by the size of the description.
On a 42 KB description the same chain costs about 4,000 tokens: the description grew 31 times (42 KB to 1.3 MB), the chain grew 3 to 6 times.
For descriptions that fit the context window, the index saves tokens; past the window size, it is the difference between an impossible task and a routine one.

## Scaling up: Google Compute Engine and the GitHub REST API

The 1.3 MB description above is large, but public API catalogs go much further.
To see how the chain behaves as descriptions grow, the same experiment ran on two public descriptions, unmodified:

- **Google Compute Engine API v1** — 3.5 MB, OpenAPI 3.0.
  Google publishes its APIs in its own Discovery format rather than OpenAPI, so this is the [APIs.guru](https://apis.guru/) OpenAPI conversion of the official Discovery document — the real Compute Engine API surface, mechanically converted.
- **GitHub REST API** — 9.8 MB, OpenAPI 3.0.3.
  The official first-party description from [`github/rest-api-description`](https://github.com/github/rest-api-description), the same file GitHub's own SDKs are generated from, and the largest well-known public OpenAPI description.

### Google Compute Engine: 3.5 MB, 730k tokens

The whole file is **730,154 tokens** — three and a half 200k windows.
The full unfiltered index is 157,149 tokens (1,437 nodes), so the agent starts from the level-2 map instead.

Task: _"Create a VM instance."_

| Step                                            | Command                                                                | Output size |     Tokens |
| ----------------------------------------------- | ---------------------------------------------------------------------- | ----------: | ---------: |
| 1. Map the spec (4 sections, 90 tags)           | `--format=json --level 2`                                              |     22.5 KB |      5,635 |
| 2. Open the `instances` branch (~40 operations) | `--node instances`                                                     |     28.7 KB |      7,040 |
| 3. The insert operation with its closure        | `--node 'POST /projects/{project}/zones/{zone}/instances' --with-deps` |     81.3 KB |     17,695 |
| **Total**                                       |                                                                        |             | **30,370** |

Step 3 is where the 64 KB closure cap earns its keep: the `Instance` schema fans out across the whole description, and the closure delivered the **31 nearest schemas** (`Instance`, `AttachedDisk`, `Scheduling`, …) in dependency order, filling 61.9 KB of the 64 KB budget.
Anything deeper stays one `--node` call away instead of flooding the response.

### GitHub REST API: 9.8 MB, 1.9M tokens

The whole file is **1,946,991 tokens** — nearly ten 200k windows; it does not fit even a 1M-token window.
And this is the scale where the full index stops fitting too: `--format=json` with no filters produces 306,525 tokens (3,038 nodes), more than the window itself.
Hierarchical drill-down is no longer an optimization here — it is the only way an agent can work with this file at all.

Task: _"Create a repository for the authenticated user."_

| Step                                           | Command                                 | Output size |     Tokens |
| ---------------------------------------------- | --------------------------------------- | ----------: | ---------: |
| 1. Map the spec (47 tags)                      | `--format=json --level 2`               |     15.1 KB |      3,678 |
| 2. Open the `repos` branch — the API's largest | `--node repos`                          |    103.4 KB |     27,017 |
| 3. The create operation with its closure       | `--node 'POST /user/repos' --with-deps` |     82.4 KB |     18,946 |
| **Total**                                      |                                         |             | **49,641** |

The closure again filled its budget almost exactly — 63.6 KB of 64 KB — but with only **14 schemas** this time: GitHub's schemas are individually much larger than Google's, so fewer of them fit the same bound.
The bound is what matters: the response stays predictable regardless of how heavy the schema graph is.

### The curve across all three

| Description                          |   Size | Whole file (tokens) | Chain (+114 instruction) | vs. whole file |
| ------------------------------------ | -----: | ------------------: | -----------------------: | -------------: |
| `test.yaml` (production, anonymized) | 1.3 MB |             267,739 |            10,557–24,567 |         11–25× |
| Google Compute Engine v1             | 3.5 MB |             730,154 |                   30,370 |           ~24× |
| GitHub REST API                      | 9.8 MB |           1,946,991 |                   49,641 |           ~39× |

The description grew 7.5 times (1.3 MB to 9.8 MB); the chain grew 2 times (24.6k to 49.6k tokens).
The multiplier keeps growing with size because the chain pays for a _path_ through the tree — one map, one branch, one closure — while reading the file pays for everything.
And past a certain size the comparison stops being about savings at all: at 1.3 MB the whole file misses a 200k window by a third, at 9.8 MB it misses it ten times over and even the index alone no longer fits — yet the drill-down chain still lands at a quarter of the window, with room to work.

## Methodology notes

- Every output above comes from a real command run against the real file; sizes are the byte counts of captured `stdout`.
- Token counts come from `countTokens()` in `gpt-tokenizer` over the exact captured text, not from a characters-per-token estimate.
- The JSON samples are real command output, shortened by dropping whole nodes (never by truncating values), with names replaced by `test.yaml` and `example.com`.
- The Google and GitHub descriptions are public, so they are named and used unmodified: the Compute Engine file comes from APIs.guru (`googleapis.com/compute/v1`, converted from Google's official Discovery document), the GitHub file from the `main` branch of [`github/rest-api-description`](https://github.com/github/rest-api-description) (`api.github.com.yaml`, version 1.1.4).
- The agent chooses which nodes to open; the command syntax comes from the 114-token instruction counted separately above.
- Each command invocation analyzes the description again (about 3 seconds for 1.3 MB, 42 seconds for 9.8 MB; the split layout adds file reads across 1,002 files). A long-running process that keeps the analysis in memory would pay that cost once per session instead of once per step.
