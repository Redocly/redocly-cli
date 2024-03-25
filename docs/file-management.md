---
seo:
  title: OpenAPI file management
---

# OpenAPI file management

Every OpenAPI file is different, but most of them are lengthy. It is common to see files at 10, 30 or even 50 thousand lines long. Working with files this size can be laborious, jumping between sections to edit or to review changes. Redocly CLI makes this easier by offering commands to split the file up and make things more manageable.

## One large file to many small ones

OpenAPI is designed with support for `$ref` syntax, allowing parts of an API description to be described elsewhere, and reused between multiple descriptions. Redocly CLI takes advantage of this feature and provides the [`split`](./commands/split.md) to break your specification into multiple files.

If you have one large single file, split it up like this:

```sh
redocly split openapi.yaml --outDir myApi
```

The original file is unchanged, but look in the directory named by the `--outDir` parameter. It now contains:

- An `openapi.yaml` file, which is the entry point of the API and includes the `info` section and other metadata. This file also contains the bare bones of the API description, with all the details moved to dedicated files.
- A `paths/` directory, with a file for each of the URLs in the API. All verbs for that endpoint are in this file.
- A `components/` directory containing subdirectories for each of the top-level keys, such as `schema`, and files for the individual data structures described in each section.

By keeping your API in this format, managing changes can be easier since it's clear which file (or files) have changed, making it easier to review as things change. Many common operations can be performed on the API description in this format, such as linting. Some tools prefer a single bundled OpenAPI description, and it's common to bundle during CI (continuous integration) before doing other automated operations.

## Bundle OpenAPI to a single file

OpenAPI is designed to work across multiple files, but not all tools (or people) like to work that way. Whether you `split` your API description files to make it more manageable, or your API description contains `$ref`s to common descriptions, the [`bundle`](./commands/bundle.md) command turns it back into a single file.

Some tools require one file, so it's likely that you may need this step at some point in your workflow.

Use the bundle command like this:

```sh
redocly bundle openapi.yaml -o bundled.yaml
```

All the references are brought into a single file, that you can then pass on to other tools in your API workflow.

## Combine OpenAPI files

{% admonition type="warning" %}
This feature is experimental, and supports OpenAPI 3.x only
{% /admonition %}

When you have multiple APIs but want to publish a single API description file, the [`join`](./commands/join.md) may meet your needs. This can be useful when you are providing a combined offering and want to create unified documentation, or use a single input to other tools.

Use the command to combine files like this:

```sh
redocly join api1.yaml api2.yaml -o apis-combined.yaml
```

Supply as many API descriptions as you need to; the first one is used for the `info` and other metadata, endpoints from the following files are then added to the OpenAPI description.

## Quantify an OpenAPI description

It's sometimes nice to get an overall view of complex API descriptions. Redocly CLI has a [`stats`](./commands/stats.md) command that gives a simple overview of what's in a file.

```sh
redocly stats openapi.yaml
```

Gives a summary of the API, including the number of operations, tags, schemas, and other measurements.

## Further reading

- See [all Redocly CLI commands](./commands/index.md)
- Learn how to [filter out internal API endpoints before publishing](./guides/hide-apis.md) if you have more detailed API descriptions than you want to pass to another stage of the API workflow
