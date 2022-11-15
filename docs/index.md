---
tocMaxDepth: 2
---

# Redocly CLI

Redocly CLI is an open source command-line tool that makes it easier to work with OpenAPI definition files. You can split large files into smaller files, then manage them with your [favorite version control service](../workflows/sources/index.md).

Commands, rules and plugins help you validate your API definitions and preview docs locally. And when it's time to publish (using Redoc or Redocly, naturally), you can bundle everything back into a single file.

Redocly CLI also integrates with other Redocly products such as the API registry, and you can build production-ready reference docs if you have an enterprise license key.

## Key features

- ✅ Split large definition files into bite-sized chunks.
- ✅ Remote $refs can reference definitions hosted on any location.
- ✅ Quickly bundle multiple files into a single file for publishing or rendering with external tools.
- ✅ Use built-in linting rules or create your own.
- ✅ Validate a 1 MB file in less than one second.
- ✅ Get intuitive, helpful error and warning messages that are designed for humans.
- ✅ Preview reference docs as you go.
- ✅ Support for OAS 3.1, OAS 3.0, and Swagger 2.0 included.

## Customization and configuration
Just because it's open source, doesn't mean we've skimped on the goodies.

Most customization can be done in the Redocly configuration file (`redocly.yaml`). Create your own [linting rules](./resources/custom-plugins.md) to ensure definitions validate to _your_ requirements. Remove content during the bundling process using [decorators](./decorators.md). Go all out by utilizing plugins and apply a combination of rules and decorators that meet your specific needs.

## What makes Redocly CLI great

### Superior performance
Unlike other OpenAPI validation tools, Redocly CLI defines the possible type tree of a valid OpenAPI definition, then traverses it (similar to how compilers work). The result? Better performance.

### A multi-file approach

You can write OpenAPI definitions in either a single file or in multiple files. A single file is good for beginners and for simple APIs. The more complex the API, the longer the definition. The longer the definition, the trickier it is to deal with, increasing the risk of syntax and validation errors, and decreasing developer buy-in.

The solution is a multi-file approach. This is where you define the main structure of the API in a root definition file and everything else is stored in smaller, separate files. During the bundling process, Redocly CLI compiles multiple files (linked with $refs) into one file in a single command. You don't have to install and maintain a third-party tool to do the job.

Compare the examples below. Note that the definitions aren't complete, but they show you what's possible with a multi-file approach.

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

### Validation that meets you where you are

Linting your OpenAPI definition ensures that it's valid and adheres to a set of rules and standards. This is especially important if you follow the design-first approach to developing APIs. You can use built-in linting rules, create your own custom rules — or a combination of both. Custom rules also extend basic functionality so you can respond to specific use-cases.

## Relationship to Redoc
Redocly CLI keeps you sane as you maintain your API definitions. [Redoc](../redoc/quickstart.md) swiftly deploys your docs to a website so all your hard work can be appreciated. There are [multiple deployment options for Redoc](../redoc/deployment/intro.md).

## Read the docs!
Everything you need to know about Redocly CLI is contained in the following pages. We take as much pride in our docs as we do in our code, so we're always fine-tuning, updating and improving. We suggest you start with our [quickstart guide](./quickstart.md).

## Want to contribute?

Then join our active and supportive community! The source code is available at https://github.com/Redocly/redocly-cli.
