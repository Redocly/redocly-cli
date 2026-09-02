---
slug:
  - /docs/cli/commands/generate-arazzo
  - /docs/respect/commands/generate-arazzo
---

# `generate-arazzo`

Auto-generate an Arazzo description based on an OpenAPI description file.

{% admonition type="warning" %}

Given the nature of OpenAPI, the generated Arazzo description is not a complete test file and may not function. Dependencies between endpoints are not resolved.

It acts as a starting point for a test file and needs to be extended to be functional.
{% /admonition %}

The first HTTP response is used as the success criteria for each step.

After writing the file, the command prints a ready-to-run [`respect`](./respect.md) command, including an `--input` placeholder for every workflow input.
Before running the command, replace the placeholder values with real ones.

With `--with-ai`, the generated one-workflow-per-operation skeleton is redesigned by an AI provider into realistic multi-step workflows, using the OpenAPI description as context.
See the [Redesign workflows with AI](#redesign-workflows-with-ai) section.

## Usage

```sh
npx @redocly/cli@latest generate-arazzo <your-OAS-description-file> [-o | --output-file]
npx @redocly/cli@latest generate-arazzo <your-OAS-description-file> --with-ai [--ai-provider=<option>] [--ai-model=<string>] [--max-workflows=<number>]
```

## Options

{% table %}

- Option {% width="20%" %}
- Type {% width="15%" %}
- Description

---

- -o, --output-file
- string
- Name for the generated output file. Defaults to `auto-generated.arazzo.yaml` **If the file already exists, it's overwritten.** See the [specify output file](#specify-output-file) section.

---

- --with-ai
- boolean
- Redesign the generated workflows with an AI provider, using the OpenAPI description as context.
  Default: `false`.
  See the [redesign workflows with AI](#redesign-workflows-with-ai) section.

---

- --ai-provider
- string
- AI provider used with `--with-ai`.
  Runs the corresponding CLI in non-interactive mode.
  **Possible values:** `claude`, `codex`, `cursor`.
  Default: `claude`.

---

- --ai-model
- string
- Model passed to the selected AI provider.
  If not set, the provider's default model is used.

---

- --ai-concurrency
- number
- Number of workflows designed in parallel with `--with-ai` when a large description is handled in two phases.
  Default: `4`.

---

- --max-workflows
- number
- Most workflows the AI may design with `--with-ai`.
  The output contains the most likely scenarios instead of every combination.
  Default: `10`.

{% /table %}

## Examples

Run the command: `npx @redocly/cli@latest generate-arazzo 'https://warp-single-sidebar.redocly.app/_spec/apis/index.yaml'`

The command generates an `auto-generated.arazzo.yaml` file in the current directory.

The contents of the generated file are:

```yaml {% title="auto-generated.arazzo.yaml" %}
arazzo: 1.1.0
info:
  title: Warp API
  version: 1.0.0
sourceDescriptions:
  - name: warp
    type: openapi
    url: https://warp-single-sidebar.redocly.app/_spec/apis/index.yaml
workflows:
  - workflowId: post-timelines-workflow
    steps:
      - stepId: post-timelines-step
        operationId: $sourceDescriptions.warp.createTimeline
        successCriteria:
          - condition: $statusCode == 201
  - workflowId: get-timelines-workflow
    steps:
      - stepId: get-timelines-step
        operationId: $sourceDescriptions.warp.listTimelines
        successCriteria:
          - condition: $statusCode == 200
  - workflowId: delete-timeline-{timeline_id}-workflow
    steps:
      - stepId: delete-timeline-{timeline_id}-step
        operationId: $sourceDescriptions.warp.deleteTimeline
        successCriteria:
          - condition: $statusCode == 204
  - workflowId: post-travels-workflow
    steps:
      - stepId: post-travels-step
        operationId: $sourceDescriptions.warp.timeTravel
        successCriteria:
          - condition: $statusCode == 200
  - workflowId: post-items-workflow
    steps:
      - stepId: post-items-step
        operationId: $sourceDescriptions.warp.registerItem
        successCriteria:
          - condition: $statusCode == 200
  - workflowId: post-events-workflow
    steps:
      - stepId: post-events-step
        operationId: $sourceDescriptions.warp.manipulateEvent
        successCriteria:
          - condition: $statusCode == 200
  - workflowId: post-anchors-workflow
    steps:
      - stepId: post-anchors-step
        operationId: $sourceDescriptions.warp.setAnchor
        successCriteria:
          - condition: $statusCode == 201
  - workflowId: post-paradox-checks-workflow
    steps:
      - stepId: post-paradox-checks-step
        operationId: $sourceDescriptions.warp.checkParadox
        successCriteria:
          - condition: $statusCode == 200
  - workflowId: get-monitor-timeline-workflow
    steps:
      - stepId: get-monitor-timeline-step
        operationId: $sourceDescriptions.warp.monitorTimeline
        successCriteria:
          - condition: $statusCode == 200
```

The generated file is not a complete test file and needs to be extended to be functional.

### Specify output file

By default, the CLI tool writes the generated file as `auto-generated.arazzo.yaml` in the current working directory. Use the optional `--output-file` argument to provide an alternative output file path.

```bash Command
redocly generate-arazzo <your-OAS-description-file> --output-file=arazzo-custom.yaml
```

### Redesign workflows with AI

Without AI, the generated file contains one workflow per operation and no dependencies between them.
With `--with-ai`, the OpenAPI description and the generated skeleton are sent to an AI provider, which redesigns the workflows into realistic scenarios:

- Related operations are grouped into multi-step workflows (for example: create, read, update, then delete a resource).
- Steps pass values to each other through `outputs` and runtime expressions.
- Workflows declare `inputs` for values a caller must provide.

The AI designs at most `--max-workflows` workflows (default `10`), preferring to cover every operation and otherwise choosing the most likely scenarios.
The AI's answer is never trusted blindly:

- `arazzo`, `info`, and `sourceDescriptions` must come from the generated baseline
- every step must reference an existing operation in the OpenAPI description
- workflow count must stay within `--max-workflows`
- the result must pass validation with the `spec` ruleset

Large descriptions that don't fit a single prompt are handled in two phases:

1. The AI chooses up to `--max-workflows` scenarios from a compact operation index.
2. The AI designs each scenario's workflow from only its operations.

This two-phase mode skips scenarios whose design is rejected, and the accepted workflows are included in the output.

The command keeps the auto-generated workflows even if:

- the answer is rejected
- the provider fails
- the operation index is too large to prompt with

The generated file starts with a comment marking the workflows as AI-inferred.
The workflows are a guess derived from the description, not verified behavior.
Review them before use.
The result also varies between runs: the same description can produce different workflows each time.

```bash
redocly generate-arazzo openapi.yaml --with-ai --ai-provider claude --max-workflows 5
```

{% admonition type="warning" name="Data sharing" %}
`--with-ai` sends the resolved OpenAPI description to the selected AI provider.
Make sure it contains no secrets or personal data you are not allowed to share.
{% /admonition %}

#### AI providers

The workflows are designed by a locally installed AI CLI running in non-interactive mode: `claude` (Claude Code), `codex` (Codex CLI), or `cursor` (Cursor CLI).
The selected CLI must be installed and authenticated on the machine running the command.
No API key is passed to or stored by Redocly CLI.

The provider runs in isolation: project context the CLIs normally load (such as `CLAUDE.md`, `AGENTS.md`, or `.cursor/rules`) and settings like a configured model do not apply.
Use `--ai-model` to choose a model, or the provider's default is used.

## Resources

- [Learn more about Arazzo](/learn/arazzo/what-is-arazzo).
- [Lint command](./lint.md) to lint your Arazzo description.
- [Respect command](./respect.md) to execute your Arazzo description.
