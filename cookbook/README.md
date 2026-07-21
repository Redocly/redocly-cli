# Redocly CLI Cookbook

A community collection of rulesets, configuration, custom plugins and other additions for [Redocly CLI](https://github.com/Redocly/redocly-cli). We know our users have some great tips, examples, and code to share, and this is the place to do just that. We would love to have your [contributions](#contributing) here too!

> [!IMPORTANT]
> Redocly are the repository maintainers, but we can't thoroughly test everything here. Please browse, share, and use what you find at your own risk.

If you're new to Redocly CLI, start with the [documentation](https://redocly.com/docs/cli/) to get up and running, then come back here to pick out any elements you would like to re-use yourself. To keep up with new developments, either subscribe to the project repository, or [sign up for the Redocly product newsletter](https://redocly.com/product-updates/).

## Usage

Use the content here as a starting point for your own work.

1. Take a look at what's available in each category, and pick any that you think apply to your situation.

2. Each section links to the documentation for that feature, incase you need an introduction or refresher.

3. Copy and paste the examples you want to use into your own setup, then edit them to fit your own needs.

If you come up with something new, please consider sharing it here by opening a pull request.

## Categories

### Rulesets

Combine existing [built-in rules](https://redocly.com/docs/cli/rules/built-in-rules/) in ways that serve a specific purpose, and make a [resuable ruleset](https://redocly.com/docs/cli/guides/configure-rules/#create-a-reusable-ruleset).

- [Spec-compliant ruleset](rulesets/spec-compliant/)
- [Spot common mistakes](rulesets/common-mistakes)
- [Security ruleset](rulesets/security) adds some defensive rules to your description.

### Configurable rules

There are some fantastic examples of [configurable rules](https://redocly.com/docs/cli/rules/configurable-rules/) in the wild, we hope the list here inspires you to share more of your own!

- [Ban certain words from descriptions](configurable-rules/description-banned-words/)
- [Require `items` field for schemas of type `array`](configurable-rules/required-items-for-array-schemas/)
- [Ensure sentence case in operation summaries](configurable-rules/operation-summary-sentence-case)
- [`POST` SHOULD define `requestBody` schema](configurable-rules/operation-post-should-define-request-body/)
- [`GET` SHOULD NOT define `requestBody` schema](configurable-rules/operation-get-should-not-define-requestBody/)
- [`DELETE` SHOULD NOT define `requestBody` schema](configurable-rules/operation-delete-should-not-define-requestBody/)
- [Info section must have a description](configurable-rules/info-description)
- [No `<script>` tags in descriptions](configurable-rules/no-script)
- [Paths should not match a pattern](configurable-rules/path-excludes-pattern/)
- [API healthcheck rules](configurable-rules/api-health/)
- [String schemas length defined](configurable-rules/string-schemas-length-defined/)
- [JSON Schema misconfigurations](configurable-rules/json-schema-misconfigurations/)
- [Azure APIM unsupported keywords](configurable-rules/azure-apim-unsupported-keyword/)
- [Operation-deprecated-response-headers](configurable-rules/operation-deprecated-response-headers/)

### Custom plugins

The [custom plugin](https://redocly.com/docs/cli/custom-plugins/) is the ultimate in extensibility, but it's an advanced feature. Try these plugins for inspiration and to get you started. Rather than including the whole plugin, there are also sections for individual rules and decorators further down.

- [Sorting plugin](./custom-plugins/sorting) - rules to check sort order and decorators to transform an API description into the correct order. Includes sorting for tags, methods, properties and enum values.

#### Decorators (for custom plugins)

- [Tag sorting](./custom-plugin-decorators/tag-sorting) - put your tags list in alphabetical order.
- [Substitute datetime placeholders in an API description](./custom-plugin-decorators/update-example-dates) - update dates in examples to the current date.
- [OpenAI isConsequential](./custom-plugin-decorators/openai-is-consequential) - add `x-openai-isConsequential: true` specification extension to GET operations.
- [Remove extensions](./custom-plugin-decorators/remove-extensions) - remove any given [OpenAPI Extensions](https://spec.openapis.org/oas/v3.1.0#specification-extensions) from an OpenAPI document.
- [Remove unused tags](./custom-plugin-decorators/remove-unused-tags) - remove tags that are declared but not used by any operations.
- [Azure APIM](./custom-plugin-decorators/azure-apim) - remove features unsupported by Azure APIM such as examples.
- [Swap summary and description](./custom-plugin-decorators/swap-summary-description) - swap the contents of summary and description fields if they are the wrong way round.

#### Rules (for custom plugins)

- [Validate Markdown](./custom-plugin-rules/markdown-validator) - check Markdown in description fields is valid.
- [Check code samples](./custom-plugin-rules/code-sample-checks) - check that an expected list of code samples is present in `x-code-samples` for every operation.

### Miscellaneous (including tips and tricks)

Share anything that didn't fit the existing categories here.

- [Script to re-order an API description](./miscellaneous/reorder-bundled-description-properties/) and put the top-level properties in a particular order.

## Contributing

Please share your best Redocly CLI usage with us! Each item should be shared in its own pull request, following the existing directory structure and including the [README template](readme-template.md) copied into each folder. Full instructions are in the [CONTRIBUTING file](CONTRIBUTING.md).

## Requests

If there's something you think should be in the collection and it isn't, let us know! Open an issue, and describe the problem you'd like to see solved with Redocly CLI. We can't make promises, but we are pretty sure someone out there will know the answer.
