---
tocMaxDepth: 2
---

# Redocly OpenAPI CLI

## Overview

Redocly OpenAPI CLI is an open-source command-line tool used to:

- Lint and bundle your OpenAPI definition(s).
- Split single-file OpenAPI files into a multi-file format.
- Preview reference docs for local development.
- Integrate with Redocly's API registry.
- Build production-ready reference docs (requires an Enterprise license key).

:::success Tip
You can also [extend](./resources/custom-rules.md) the functionality of Redocly OpenAPI CLI by dynamically adding
or removing content during the bundling process using decorators or by defining your own rules to validate OpenAPI definitions.
:::

## Features

Currently, Redocly OpenAPI CLI supports these features:

- ✅ Multi-file validation. No need to bundle your files before validation.
- ✅ Lightning-fast validation. Check a 1 MB file in less than one second.
- ✅ Support for remote `$ref`s. Reference a definition hosted on any location.
- ✅ Bundle a multi-file definition into a single file for compatibility with external tools.
- ✅ Configurable severity levels for each rule. Fine tune Redocly OpenAPI CLI to suit your needs.
- ✅ Human-readable error messages. Now with stacktraces and codeframes.
- ✅ Intuitive suggestions for misspelled types or references. No error will pass you by.
- ✅ Easy-to-implement custom rules. Need something? Ask us or do it yourself.
- ✅ Preview reference docs. Writing OpenAPI documents has never been easier.
- ✅ Support for OAS 3.1, OAS 3.0, and Swagger 2.0.

## Why Redocly OpenAPI CLI?

OpenAPI CLI is your all-in-one Swiss army knife when designing, defining, and working with OpenAPI definitions.

There are four pillars that make Redocly OpenAPI CLI great - **performance**, **bundling**, **linting**, and **extensibility**. To better understand why you need to look at the OpenAPI authoring process from a higher level.

### Performance

**Performance** is associated with _validation_. Unlike other OpenAPI validators, Redocly OpenAPI CLI defines the possible type tree of a valid OpenAPI definition and then traverses it. This approach is very similar to how compilers work and results in major performance benefits over other approaches.

### Bundling

Bundling is a process of compiling multiple referenced files (linked with `$ref`s) into a single one.

Generally, there are two approaches to writing OpenAPI definitions: single-file and multi-file. The first approach is great for beginners, when you learn the basics and try to define small APIs. However, when you start designing complex APIs with a lot of endpoints, the single-file approach becomes increasingly impractical.

The solution is the multi-file approach, where you define the main structure of the API in the root definition file. Everything else that can be reused or segmented into smaller units is located in separate files.

Compare the following examples:

<details>
<summary>Single-file approach</summary>

```yaml openapi.yaml
openapi: "3.0.0"
info:
  version: 1.0.0
  title: Swagger Petstore
  description: Multi-file boilerplate for OpenAPI Specification.
  license:
    name: MIT
servers:
  - url: http://petstore.swagger.io/v1
paths:
  /pets:
    get:
      summary: List all pets
      operationId: listPets
      tags:
        - pets
      parameters:
        - name: limit
          in: query
          description: How many items to return at one time (max 100)
          required: false
          schema:
            type: integer
            format: int32
      responses:
        '200':
          description: A paged array of pets
          [...]
          content:
            application/json:
              schema:
                  type: object
                  required:
                    - id
                    - name
                  properties:
                    id:
                      type: integer
                      format: int64
                    name:
                      type: string
                    tag:
                      type: string
  /pets/{petId}:
    get:
      summary: Info for a specific pet
      operationId: showPetById
      parameters:
        - name: petId
          in: path
          required: true
          description: The id of the pet to retrieve
          schema:
            type: string
      responses:
        '200':
          description: Expected response to a valid request
          content:
            application/json:
              schema:
                  type: object
                  required:
                    - id
                    - name
                  properties:
                    id:
                      type: integer
                      format: int64
                    name:
                      type: string
                    tag:
                      type: string
```

</details>

<details>
<summary>Multi-file approach</summary>

```yaml Main openapi.yaml file
openapi: "3.0.0"
info:
  version: 1.0.0
  title: Swagger Petstore
  description: Multi-file boilerplate for OpenAPI Specification.
  license:
    name: MIT
servers:
  - url: http://petstore.swagger.io/v1
paths:
  /pets:
    $ref: "./paths/pets.yaml"
  /pets/{petId}:
    $ref: "./paths/pet.yaml"
components:
  parameters:
    $ref: "./parameters/_index.yaml"
  schemas:
    $ref: "./schemas/_index.yaml"
  responses:
    $ref: "./responses/_index.yaml"
```

```yaml Referenced ./paths/pets.yaml file
get:
  summary: Info for a specific pet
  operationId: showPetById
  tags:
    - pets
  parameters:
    - $ref: "../parameters/path/petId.yaml"
  responses:
    '200':
      description: Expected response to a valid request
      content:
        application/json:
          schema:
            $ref: "../schemas/Pet.yaml"
    default:
      $ref: "../responses/UnexpectedError.yaml"
```

```yaml Referenced ./schemas/Pet.yaml file
type: object
required:
- id
- name
properties:
id:
  type: integer
  format: int64
name:
  type: string
tag:
  type: string
```

</details>

:::info Note
Please note that the definitions above are not complete and are used as a demonstration for you to grasp the basic idea of the multi-file approach.
:::

The problem with the multi-file approach is that many existing tools offer multi-file support as the only feature, meaning that you will have yet another tool to install and maintain. OpenAPI CLI has a strong advantage here over other tools, as it bundles files automatically and it's just one of the powerful features it provides you with.

### Linting and extensibility

Linting is associated with _extensibility_. Linting is used to ensure that your OpenAPI definition is clear and doesn't contain errors or quality issues. To instruct OpenAPI CLI how to detect those issues, you use either built-in or custom rules, or the combination of both. With these rules, you ensure that the OpenAPI documents are consistent, correct, and follow a specific API design standard or style. Furthermore, custom rules can help you extend the basic functionality to cover specific use-cases that your API definitions need to accommodate. Using rule-based linting is especially useful when you follow the design-first API development approach.

## Contributions

The source code is available in the [OpenAPI-CLI GitHub repository](https://github.com/Redocly/openapi-cli).
