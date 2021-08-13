# Redocly OpenAPI CLI

Redocly OpenAPI CLI is an open source command-line tool used to:

- Lint and bundle your OpenAPI definition(s).
- Decorate your APIs (add or remove data).
- Preview reference docs for local development.
- Split single-file OpenAPI files into a multi-file format.
- Integrate with Redocly's API registry.
- Build production-ready reference docs (requires an Enterprise license key).


Redocly OpenAPI CLI can be:

- Extended by writing [custom rules and decorators](custom-rules.md).


## Features

Currently, Redocly OpenAPI CLI supports these features:

- [x] Multi-file validation. No need to bundle your files before validation.
- [x] Support for remote `$ref`s.
- [x] Configurable severity levels for each rule. Tailor your experience with Redocly OpenAPI CLI to suit your needs.
- [x] Lightning-fast validation. Check a 1 MB file in less than one second.
- [x] Human-readable error messages. Now with stacktraces and codeframes.
- [x] Intuitive suggestions for misspelled types or references.
- [x] Easy-to-implement custom rules. Need something? Ask us or do it yourself.
- [x] Bundle a multi-file definition into a single file for compatibility with external tools.
- [x] Preview reference docs.
- [x] Support for OAS 3.0 and Swagger 2.0 (OAS 3.1 is coming soon).


## What makes Redocly OpenAPI CLI different

As you can see from the previous section, OpenAPI CLI is your all-in-one swiss army knife that can fulfill all your needs when designing, defining, and working with OpenAPI definitions.

There are four pillars that make Redocly OpenAPI CLI great - **performance**, **bundling**, **linting**, and **extensibility**. To better understand why you need to
look at the OpenAPI authoring process from a higher level.

### Performance

**Performance** is associated with _validation_. Unlike other OpenAPI validators, Redocly OpenAPI CLI defines the possible type tree of a valid OpenAPI definition and then traverses it. This approach is very similar to how compilers work and results in major performance benefits over other approaches.

### Bundling

Bundling is a process of compilation of multiple referenced files (linked with `$ref`s) into a single one. Generally, there are two approaches to writing OpenAPI definitions: single-file and multi-file. The first approach is great for beginners when you learn the basics
and then try to define small APIs. But as soon as you dive deeper and start designing complex APIs with a lot of endpoints, the single-file approach becomes increasingly impractical.

That's why people proceed with the multi-file approach, where you define the main structure of the API in the root definition file and everything else that can be reused or segmented into smaller units is located in separate files.

The problem with the multi-file approach is that many existing tools offer multi-file support as the only feature, meaning that you will have yet another tool to install and maintain. OpenAPI CLI has a strong advantage here over other tools, as it bundles files automatically and it's just one of the powerful features it provides you with.

### Linting and extensibility

Linting is associated with _extensibility_. Linting is used to ensure that your OpenAPI definition is clear and doesn't contain junk information. To instruct OpenAPI CLI what's junk and what's not you use either built-in or custom rules or the combination of both. With these rules, you ensure that the OpenAPI documents are consistent and correct as well as follow a specific API design standard/style. Furthermore, custom rules can help you extend the basic functionality to cover specific use-cases depending on the specification of your API definitions. Using rule-based linting is especially useful when you follow the design-first API development approach.

## Installation and usage

You can install and use OpenAPI CLI in any of these ways:

- `npx` (NPM's package runner)
- `npm -g` (NPM's global installation)
- `npm` (NPM as a package local to a project)
- `yarn global` (Yarn's global installation)
- `yarn` (Yarn as a package local to a project)
- `docker` (use a Docker image)

### Global installations

**Install globally with npm**

<div class="attention">This is the recommended installation method.</div>

`npm install -g @redocly/openapi-cli@latest`

![install openapi-cli globally](./images/install-update-openapi-cli.gif)

**Install globally with yarn**

`yarn global add @redocly/openapi-cli`

**Verify your global installation**

After installing it globally, run `openapi --version` to confirm the installation was successful.


#### Set up tab completion

OpenAPI CLI supports the tab completion functionality.

To set it up for your terminal, generate the completion script with the command:

```shell
openapi completion
```

The command output contains installation instructions. For example, to install the completion script in **bash**, use:

```shell
openapi completion >> ~/.bashrc
```

The approach is similar for other shells. After the installation, restart your terminal for changes to take effect.


### Runtime installations

**Install and use with npx**

NPX is NPM's package runner.
It will install and run a command at the same time (without installing it globally).

`npx @redocly/openapi-cli <command> [options]`

Here is a sample command:

```shell
npx @redocly/openapi-cli@latest lint
```

**Install and use with docker**

To give the Docker container access to the OpenAPI definition files, you need to mount the containing directory as a volume. Assuming the OAS definition is rooted in the current working directory, you need the following command:

```
docker run --rm -v $PWD:/spec redocly/openapi-cli lint path-to-root-file.yaml
```

### Using OpenAPI CLI commands

Read more about [supported commands in Redocly OpenAPI CLI](./commands/index.md).

### Contributions

The source code is available in the [OpenAPI-CLI GitHub repository](https://github.com/Redocly/openapi-cli).
