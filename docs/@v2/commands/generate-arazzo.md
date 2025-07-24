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

## Usage

```sh
npx @redocly/cli@latest generate-arazzo <your-OAS-description-file> [-o | --output-file]
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

{% /table %}

## Examples

Run the command: `npx @redocly/cli@latest generate-arazzo 'https://warp-single-sidebar.redocly.app/_spec/apis/index.yaml'`

The command generates an `auto-generated.arazzo.yaml` file in the current directory.

The contents of the generated file are:

```yaml {% title="auto-generated.arazzo.yaml" %}
arazzo: 1.0.1
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

## Resources

- [Learn more about Arazzo](/learn/arazzo/what-is-arazzo).
- [Lint command](./lint.md) to lint your Arazzo description.
- [Respect command](./respect.md) to execute your Arazzo description.
