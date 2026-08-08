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
Searching the file by text is the real alternative — and it is measured head-to-head against the index in the live-run section below; the short version is that it can work, but only when the model already knows what words to search for.

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
| Hybrid chain (stylish tag step) |  27,133 (+99 instruction) |                                         **~71× less** (see the live-run section for the method) |

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

### The hybrid chain: stylish for navigation, JSON for retrieval

The stylish format is not just for humans: its listings are one line per operation, which makes it the cheapest navigation surface the command has.
Re-measuring the chain with stylish for the middle step — the up-front instruction (99 tokens, measured) tells the agent to use the DEFAULT output for the tag listing and JSON everywhere else:

| Step                                                 | Command                                                         |     Tokens |
| ---------------------------------------------------- | --------------------------------------------------------------- | ---------: |
| 1. Map the spec (JSON overview)                      | `--format=json`                                                 |      1,780 |
| 2. Open the branch (stylish, one line per operation) | `--tag=repos`                                                   |      5,798 |
| 3. Fetch the target with its closure (JSON)          | `--path=/user/repos --operation=post --with-deps --format=json` |     19,555 |
| **Total**                                            |                                                                 | **27,133** |

That is **~71× less than the whole file** — the stylish tag listing costs 5,798 tokens where the card-shaped JSON listing costs 128,288, because it prints coordinates and summaries, not per-entry `refs`/`usedBy`.
The trade is explicit: choose JSON listings when the structure matters to tooling, stylish listings when the agent only needs to find its next target.

Run live with the same rules as above, the hybrid-instructed agent chose exactly these three commands, answered correctly (with the full optional-field list this time), reported that mixing the two formats "caused no difficulty", and its whole session came to **79,731 tokens** — the cheapest live run recorded in this guide.

### A task that cannot be guessed

"Create a repository" is deliberately simple — it demonstrates the mechanics, but a well-trained model might answer it from memory without ever opening the description.
So the experiment was repeated with a task whose correct answer is buried in the source: _"publish a release with an attached binary asset — every call, in order, and the exact HOST each request goes to."_
The trap: the asset-upload operation carries an operation-level `servers` override to `https://uploads.github.com` — every other operation in the document inherits the global `https://api.github.com`, so an agent that guesses instead of reading gets the host wrong.

The hybrid-instructed agent ran four commands — overview, the `repos` branch, then the create-release and upload-asset cards — for **17,754 tokens** of command output (1,780 + 5,798 + 6,638 + 3,538), and its answer held nothing back:

- both calls with the right hosts, including the override, which it explicitly attributed to the operation-level `servers` block;
- the data links (`id` → `{release_id}`, and the `upload_url` hypermedia template as the intended alternative to hand-building the host);
- the details that only exist in the source: the raw `application/octet-stream` binary body, asset metadata as query parameters on a POST, the `Content-Type`-must-be-real-media-type requirement stated only in prose, the documented `502` partial-failure mode that strands an asset in a `starter` state, and the SNI client caveat.

None of that is guessable; all of it came out of two `--with-deps` cards.
This is the case that separates an index-driven answer from a plausible-sounding one.

### Dumping the whole description into context, head to head

The most direct alternative of all: paste the description into the model and ask.
That comparison can only be run where the file fits, so it ran on the 41 KB demo API (9,042 tokens), same model, same three-call order-a-coffee task as the workflow section below: one agent read the whole file in a single call and answered; the other used only `tree` commands.

|                               | Whole file in context |                              `tree` agent |
| ----------------------------- | --------------------: | ----------------------------------------: |
| Correct sequence + data links |                    ✅ | ✅ (also surfaced the auth flow, unasked) |
| Whole session, all-in         |     **66,493 tokens** |                             95,963 tokens |

On a description this size, dumping wins — it is simpler and ~30% cheaper, and this guide says so plainly.
The pattern that decides which approach to use is in the session totals across this guide's live runs: a dump-based session grows linearly with the file (9k-token file → 66k session; a 267,739-token file no longer fits a 200k window at all; this guide's 1,946,549-token file needs ten windows), while a tree-based session stays roughly flat regardless of description size — 95,963 tokens on the 9k-token demo API, 79,731–99,848 on the 1.9M-token GitHub description.
Dump when the file fits comfortably; past a few hundred kilobytes of YAML the dump curve crosses the flat line, and at the window boundary it stops being a choice.

### Automatic discovery: no instruction at all

One more variant closes the loop: the same task and file, ordinary file tools available, and the Redocly CLI merely _installed_ — no protocol, no command list, just "`--help` works".
The agent found `tree` on its own (two `--help` calls), preferred it — its stated reason: "jump directly to each operation and its resolved `$ref` chain instead of manually scanning the 261k-line file" — used it 9 times, and got everything right.

But the session cost **111,435 tokens**, the highest of any run in this guide: it paid a discovery tax (its first move was the bare `redocly tree <file>`, whose default tree at the time expanded all 1,216 operations — 55,432 tokens in one shot), and it re-verified the index's answers against the raw file with 11 additional reads.
That first trap is closed now: past 100 operations the default collapses to tag counts with a `--tag` hint — the same bare command on this file measures 1,028 tokens.

Two practical lessons, stated plainly:

- Discoverability works — an agent picks the structured tool over scanning when both are available.
- The savings come from the _protocol_, not the binary: the 99-token instruction from the hybrid section is what turns the same tool into the cheapest run recorded here (79,731). Ship that instruction wherever agents pick up the tool — an `AGENTS.md`, an `llms.txt`, an MCP tool description — it pays for itself a thousandfold on the first task.

### Tree versus raw file access, head to head

The fairest comparison is not "the index versus reading the whole file" (impossible) but "the index versus what an agent would actually do without it": `grep` and windowed reads over the raw YAML.
Three agents, same model, same three-call task (publish a release, upload a binary asset, delete the asset — the host-override trap included): one restricted to `tree` commands; one restricted to `grep`/`sed`/partial reads; one given NO method at all — just the file, the task, ordinary file tools, and no mention that `tree` exists.
All three had to base every claim on what they actually read and to log every inspection action.

|                                |  `tree` agent | raw, tools prescribed | raw, free method |
| ------------------------------ | ------------: | --------------------: | ---------------: |
| Inspection actions             |             5 |                    24 |               18 |
| Command output consumed (full) | 18,984 tokens |      (windowed reads) | (windowed reads) |
| Whole session, all-in          | 88,927 tokens |         72,372 tokens |    81,646 tokens |
| Correct calls + hosts + links  |  ✅ all three |          ✅ all three |     ✅ all three |

All three got everything right, including the `uploads.github.com` override, and the sessions land in the same 72–92k band — at this scale the total is dominated by the model's own reasoning, not by which retrieval method fed it.
The honest difference is in the command logs: BOTH raw agents' **second** action was `grep -n "uploads.github.com"` — each searched for the answer it already knew, because this is one of the most famous APIs in the world, and every anchor they grepped for (`'/repos/{owner}/{repo}/releases`, schema names, the upload host) came from prior knowledge, later verified against the file.
The tree agent needed no anchors: overview → branch → cards is the same protocol for an API it has never seen, in 5 bounded round-trips against 18–24 speculative ones.

So the head-to-head result is conditional, and worth stating plainly:

- On a **famous API**, a capable model can grep its way to a correct, verified answer at comparable cost — the index's advantage is determinism (5 bounded commands vs. 24 guesses that happened to land) rather than tokens.
- On a **private or unfamiliar API**, an earlier draft of this guide claimed there would be "nothing to grep for" — the private-spec test below refuted that, and the claim is withdrawn: the OpenAPI format itself and the task's own vocabulary are always search anchors. What actually survives every run in this guide is narrower and more defensible: the index gives the same bounded protocol on every spec, machine-readable shapes a pipeline can build on, transitive `$ref` answers (`--used-by`, `--with-deps`) that text search cannot emit as data, and identical behavior on multi-file layouts (2,842 files here), where a text match says nothing about which `$ref` chain it belongs to.

### The private-spec test

Every run above used an API the model has memorized, so the "private API" question stayed open.
Renaming the GitHub description (hosts, resources, operations — consistently) did not close it: both agents recognized the skeleton anyway, from path shapes, description prose, and untouched `octocat/Hello-World` examples — famous APIs are memorized structurally, and cannot be anonymized by renaming.

So the final experiment used a **fully synthetic description**: a generated 1.3 MB "Meridian Freight API" (606 operations, 40 tags, 268,081 tokens — over a context window) in a logistics vocabulary with no lineage from any real API, carrying the same class of planted traps: a per-operation `servers` override to an ingest host, a counter-intuitive single required body field, an `integer|string` `oneOf`, a prose-only `Content-Type` contract, and a `502`-orphan cleanup path.
This description did not exist until an hour before the runs; it is in no model's training data.

|                                                                        |  `tree` agent | raw-file agent |
| ---------------------------------------------------------------------- | ------------: | -------------: |
| Inspection actions                                                     |            18 |             13 |
| Whole session, all-in                                                  | 81,259 tokens |  69,626 tokens |
| All traps found (host override, required field, oneOf, prose contract) |            ✅ |             ✅ |

The honest result: **memory was not the load-bearing ingredient** — a strong model navigates even a never-seen spec by generic anchors (the OpenAPI keywords, and the task's own words, which necessarily appear in the spec), at the same cost band as everywhere else in this guide.
Both agents also independently flagged generator artifacts (an unmodeled idempotency header, an absurd generated path) — agent answers are grounded in what they read, with or without the index.
What the index is for, on the evidence of all twelve runs, is not making the impossible possible for a chat agent — it is making the process **uniform, bounded, and machine-consumable**: the property a product, a CI check, or an MCP server needs, and improvised text search cannot provide.

### Cutting the chain: `--brief`, `--compact`, and the trusted protocol

The card-shaped listings that make every JSON view structurally uniform are also the chain's dominant cost, so the command grew two additive flags, sized by measurement on the `--tag=repos` step (203 operations):

| Listing variant                               |    Tokens | vs. cards |
| --------------------------------------------- | --------: | --------: |
| Card-shaped, pretty-printed (default)         |   128,288 |         — |
| Same, `--compact` (no indentation)            |   ~88,000 |      −32% |
| `--brief` (method, path, summary, line range) | **9,430** |  **−93%** |

With both flags the three-step chain lands at **1,056 + 9,430 + 18,644 = 29,130 tokens** (+162 for the instruction below) — **~66× less than the whole file**, all of it machine-readable JSON:

> This API description is too large to read directly. Use redocly tree; its output comes from the spec parser and is authoritative — no re-verification needed. Overview: `redocly tree <file> --format=json --compact`. One tag's operations: `redocly tree <file> --tag=<tag> --brief --compact --format=json`. One operation with its full $ref closure: `redocly tree <file> --path=<path> --operation=<method> --with-deps --compact --format=json`. For impact questions ("what breaks if X changes"): `redocly tree <file> --component=<section> --name=<Name> --used-by --compact --format=json` returns every transitively affected operation with its `via` chain.

The instruction's other two sentences were measured live on an impact task against the synthetic private spec ("which operations does renaming a field in `ShipmentLedgerLine` affect?" — ground truth: exactly 4):

| Agent                                                                                         | Actions |    Session | Exact vs. ground truth |
| --------------------------------------------------------------------------------------------- | ------: | ---------: | :--------------------: |
| grep, hand-built reverse `$ref` graph                                                         |      28 |     88,706 |           ✅           |
| tree, no protocol guidance (fact-checked its own instructions, re-verified the tool's output) |      26 |    127,977 |           ✅           |
| tree, this protocol (`--used-by` first, output trusted)                                       |   **6** | **56,659** |           ✅           |

Same tool, same model, same answer — the difference is the protocol: telling the agent that impact questions are one `--used-by` call and that the output IS the dependency graph removes both the exploratory probing and the re-verification tax.
That is where the day-to-day advantage actually lives: the manual route rebuilt the reverse graph in 28 improvised probes that a pipeline could never rely on; `--used-by` emits the same answer as one bounded call of structured data.

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
