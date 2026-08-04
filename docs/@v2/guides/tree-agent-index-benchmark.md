# How much context the `tree` index saves an agent

The [`tree`](../commands/tree.md) command's JSON index lets an AI agent work with an API description that does not fit in its context window.
This guide measures that on the largest well-known public API description: GitHub's official REST API description, 9.8 MB of OpenAPI.
For the command reference, see [`tree`](../commands/tree.md).

Every number below comes from a real command run against that file, tokenized with a BPE tokenizer (`gpt-tokenizer`, o200k family; other model families tokenize slightly differently, with the same order of magnitude).
The description is public, so the whole experiment is reproducible:

```bash
curl -O https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.yaml
```

## The setup

- **Description:** `api.github.com.yaml` from [`github/rest-api-description`](https://github.com/github/rest-api-description) — 9.8 MB, OpenAPI 3.0.3, 47 tags, 1,216 operations, 1,766 components.
  This is the first-party description GitHub's own SDKs are generated from, not a conversion or a sample.
- **Agent task:** _"Create a repository for the authenticated user."_
- **Agent constraints:** a 200,000-token context window; the agent starts knowing nothing about the description.
- **What the agent is told up front:** a short instruction naming the three commands (index → branch → leaf-with-deps) and the id forms — **114 tokens**, measured.
  The agent decides _which_ branch and operation to open by reasoning over titles and summaries; it does not discover the commands themselves.
  That one-time cost is about 0.2% of the chain below and appears as a separate line in the totals.

## Without the index

The agent's only option is to read the description:

| Input                             |        Tokens |
| --------------------------------- | ------------: |
| `api.github.com.yaml`, whole file | **1,946,991** |

At 1,946,991 tokens the file is roughly ten times a 200,000-token window, and still twice a 1,000,000-token one.
No amount of "read a bit more" helps here.
Searching the file by text instead is unreliable: it does not reveal the structure, does not follow `$ref` chains, and gives no bound on how much context the agent ends up reading.

## Why the index has to be hierarchical

At this size, a flat index does not solve the problem either:

| Input                                            |      Tokens | Nodes |
| ------------------------------------------------ | ----------: | ----: |
| `redocly tree api.github.com.yaml --format=json` | **306,494** | 3,038 |

The complete index of every tag, operation, and component is itself larger than the context window.
This is what the `--level` and `--node` options are for: the agent never asks for the whole index, only for one level or one branch at a time.
On this description the hierarchy is not an optimization — it is the only way an agent can work with the file at all.

## With the index

The agent walks the hierarchy in bounded steps, paying only for the path it chooses:

| Step                                             | Command                                                                  | Output size |     Tokens |
| ------------------------------------------------ | ------------------------------------------------------------------------ | ----------: | ---------: |
| 1. Map the spec — 4 sections, 47 tags            | `redocly tree api.github.com.yaml --format=json --level 2`               |     14.6 KB |      3,647 |
| 2. Open the branch it picked — 203 operations    | `redocly tree api.github.com.yaml --node repos`                          |    101.0 KB |     27,017 |
| 3. Fetch the target with its full `$ref` closure | `redocly tree api.github.com.yaml --node 'POST /user/repos' --with-deps` |     80.4 KB |     18,946 |
| **Total**                                        |                                                                          |             | **49,610** |

Step 3 returns a _self-contained_ slice: the operation's raw source lines (8.3 KB) plus the 14 components it transitively references — the `full-repository` schema and everything under it, the seven shared error responses, the response example — in dependency order.
That fills 63.6 KB of the 64 KB closure cap, so the response stays bounded no matter how deep the schema graph goes; anything beyond the cap stays one `--node` call away.

The most expensive step is not the largest file, it is the largest branch: `repos` is GitHub's biggest tag, and listing its 203 operations costs more than the operation and all its schemas combined.
An agent that already knows the tag can start from `--level 1` (286 tokens) and skip straight to it.

## What the agent actually sees

Step 1 is small enough to show in full — this is the entire map of a 9.8 MB API in 286 tokens:

```json
{
  "docName": "api.github.com.yaml",
  "spec": "oas3_0",
  "docDescription": "GitHub v3 REST API — GitHub's v3 REST API.",
  "structure": [
    {
      "id": "Overview",
      "title": "Overview",
      "pointer": "#/info",
      "file": "api.github.com.yaml",
      "start_line": 4,
      "end_line": 14,
      "summary": "GitHub's v3 REST API."
    },
    {
      "id": "Servers",
      "title": "Servers",
      "pointer": "#/servers",
      "file": "api.github.com.yaml",
      "start_line": 116,
      "end_line": 116,
      "summary": "https://api.github.com"
    },
    {
      "id": "Operations",
      "title": "Operations",
      "pointer": "#/paths",
      "file": "api.github.com.yaml",
      "start_line": 121,
      "end_line": 67148
    },
    {
      "id": "Components",
      "title": "Components",
      "pointer": "#/components",
      "file": "api.github.com.yaml",
      "start_line": 85076,
      "end_line": 261104
    }
  ]
}
```

Step 2 opens one branch and returns its operations, each with the summary the agent reasons over and the exact lines it can read directly:

```json
{
  "structure": [
    {
      "id": "repos",
      "title": "repos",
      "pointer": "#/tags/25",
      "file": "api.github.com.yaml",
      "start_line": 66,
      "end_line": 67,
      "summary": "Interact with GitHub Repos.",
      "nodes": [
        {
          "id": "POST /user/repos",
          "title": "POST /user/repos — Create a repository for the authenticated user",
          "operationId": "repos/create-for-authenticated-user",
          "pointer": "#/paths/~1user~1repos/post",
          "file": "api.github.com.yaml",
          "start_line": 62491,
          "end_line": 62697,
          "summary": "Create a repository for the authenticated user"
        }
      ]
    }
  ]
}
```

Step 3 returns the leaf envelope: raw source lines, the `$ref`s found inside them resolved to real locations, and the transitive closure under `deps`:

```json
{
  "id": "POST /user/repos",
  "pointer": "#/paths/~1user~1repos/post",
  "file": "api.github.com.yaml",
  "start_line": 62491,
  "end_line": 62697,
  "content": "summary: Create a repository for the authenticated user\ndescription: Creates a new repository for the authenticated user.\ntags:\n  - repos\noperationId: repos/create-for-authenticated-user\n…",
  "refs": [
    {
      "ref": "#/components/responses/bad_request",
      "resolved": true,
      "file": "api.github.com.yaml",
      "pointer": "#/components/responses/bad_request"
    }
  ],
  "deps": [
    { "id": "schemas/full-repository", "file": "api.github.com.yaml", "content": "…" },
    { "id": "schemas/nullable-repository", "file": "api.github.com.yaml", "content": "…" },
    { "id": "responses/validation_failed", "file": "api.github.com.yaml", "content": "…" }
  ]
}
```

The 14 ids returned in the closure: `schemas/full-repository`, `schemas/nullable-repository`, `schemas/nullable-license-simple`, `schemas/code-of-conduct-simple`, `schemas/basic-error`, `schemas/scim-error`, `schemas/validation-error`, `examples/full-repository`, and the `responses/*` entries for the seven documented error codes.

## The same task on a split (multi-file) layout

The same description was run through [`redocly split`](../commands/split.md), producing **2,842 files**, and the identical chain was repeated against `openapi.yaml` in that directory:

| Step                                       | Single file | Split (2,842 files) |
| ------------------------------------------ | ----------: | ------------------: |
| 1. `--format=json --level 2`               |       3,647 |               3,436 |
| 2. `--node repos`                          |      27,017 |              23,709 |
| 3. `--node 'POST /user/repos' --with-deps` |      18,946 |              18,807 |
| **Chain total**                            |  **49,610** |          **45,952** |

The split chain is slightly cheaper, because pointers inside small files are short.
Both layouts list the same 203 operations under `repos`, and operation ids are identical (`POST /user/repos`), so the same agent instructions work unchanged.

Component ids differ between the layouts, and it is worth knowing why.
In the single file, components are declared under `components`, so they get canonical ids: `schemas/full-repository`.
`redocly split` does not keep a component registry in the root document — operation files reference component files directly — so in that layout the same schema is identified by its path: `components/schemas/full-repository.yaml`.
Canonical ids appear in a split layout too, as long as the root document declares the component (`components: {schemas: {Name: {$ref: ./file.yaml}}}`), which is what a hand-maintained multi-file description usually does.
Either way the closure is retrieved by one command: here it pulled 15 components from 15 separate files and returned them as a single envelope — the case where an agent without an index would have to hand-walk `$ref`s across a 2,842-file tree without knowing which ones matter.

## The difference

|                                    |                    Tokens |   vs. whole file |
| ---------------------------------- | ------------------------: | ---------------: |
| Whole file                         |                 1,946,991 | — (does not fit) |
| Full index, unfiltered             |                   306,494 | — (does not fit) |
| Index chain                        | 49,610 (+114 instruction) |    **~39× less** |
| Index chain, starting from level 1 | 46,249 (+114 instruction) |    **~42× less** |
| Index chain on the split layout    | 45,952 (+114 instruction) |    **~42× less** |

The ratio matters less than the shape of the curve.
The chain's cost is bounded by the _largest branch_ and the _deepest single closure_, not by the size of the description: on a 1.3 MB description the same three steps cost 12,000 to 25,000 tokens, and on this 9.8 MB one they cost about 50,000.
The description grew by a factor of 7.5; the chain roughly doubled.

For descriptions that fit the context window, the index saves tokens.
Past the window size, it is the difference between an impossible task and a routine one — here the agent solves a task against a two-million-token API while using a quarter of a 200,000-token window, with the rest left for the work itself.

## Methodology notes

- Every output above comes from a real command run against the real file; sizes are the byte counts of captured `stdout`.
- Token counts come from `gpt-tokenizer` over the exact captured text, not from a characters-per-token estimate.
- The JSON samples are real command output, shortened by dropping whole nodes and eliding long string values with `…`, never by rewriting values; the file name is shortened from the local path to `api.github.com.yaml`.
- The description is `api.github.com.yaml` from the `main` branch of `github/rest-api-description`, version 1.1.4, used unmodified.
- The agent chooses which nodes to open; the command syntax comes from the 114-token instruction counted separately above.
- Each command invocation analyzes the description again — about 42 seconds for this 9.8 MB file. A long-running process that keeps the analysis in memory would pay that cost once per session instead of once per step.
