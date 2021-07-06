---
tocMaxDepth: 3
redirectFrom:
  - /docs/resources/hide-apis/
---
# Hide your internal APIs

Several times a month, a variation of this question comes up:

> How do we hide endpoints that are for internal use only?

Whatever you do... don't make these API security mistakes:

- Do not use tags to hide the display of documentation content on the screen. It may still be possible to browse the full OpenAPI definition without much effort.

- Do not leave any endpoint unprotected.

<div class="danger">If an endpoint is discovered, your API authentication mechanism must prevent unauthorized access.</div>


## Three approaches

1. Separate API definitions.
1. Separate root API files.
1. Using a decorator to remove content prior to publishing.

The best approach is indicated by the granularity level required.

|Granularity-level|Approach|
|---|---|
|Paths (no overlapping components)|Separate API definitions|
|Paths (with overlapping components)|Separate root API files|
|Operations|Decorator|
|Schema properties|Decorator|


### Separate API definitions

This is indicated only when:
- There are no shared schemas between internal and external APIs.
- You don't use code annotations to generate your definition (it may or may not be possible).

Otherwise, it may be a real pain and lead to drift between two APIs, loss of a single source of truth, and just a lot of manual work which should be avoided (see the other two approaches).


<details>
<summary>Manage two big files</summary>

```yaml internal
openapi: 3.0.2
info:
  version: 1.0.0
  title: Example.com
  termsOfService: 'https://example.com/terms/'
  contact:
    email: contact@example.com
    url: 'http://example.com/contact'
  license:
    name: Apache 2.0
    url: 'http://www.apache.org/licenses/LICENSE-2.0.html'
  x-logo:
    url: 'https://redocly.github.io/openapi-template/logo.png'
  description: >
    This is an **example** API to demonstrate features of OpenAPI specification

    # Introduction

    This API definition is intended to to be a good starting point for
    describing your API in

    [OpenAPI/Swagger
    format](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md).

    It also demonstrates features of
    [create-openapi-repo](https://github.com/Redocly/create-openapi-repo) tool
    and

    [Redoc](https://github.com/Redocly/Redoc) documentation engine. So beyond
    the standard OpenAPI syntax we use a few

    [vendor
    extensions](https://github.com/Redocly/Redoc/blob/master/docs/redoc-vendor-extensions.md).


    # OpenAPI Specification

    The goal of The OpenAPI Specification is to define a standard,
    language-agnostic interface to REST APIs which

    allows both humans and computers to discover and understand the capabilities
    of the service without access to source

    code, documentation, or through network traffic inspection. When properly
    defined via OpenAPI, a consumer can

    understand and interact with the remote service with a minimal amount of
    implementation logic. Similar to what

    interfaces have done for lower-level programming, OpenAPI removes the
    guesswork in calling the service.
externalDocs:
  description: Find out how to create a GitHub repo for your OpenAPI definition.
  url: 'https://github.com/Rebilly/generator-openapi-repo'
tags:
  - name: Echo
    description: Example echo operations
  - name: User
    description: Operations about user
servers:
  - url: 'http://example.com/api/v1'
  - url: 'https://example.com/api/v1'
paths:
  '/users/{username}':
    parameters:
      - name: pretty_print
        in: query
        description: Pretty print response
        schema:
          type: boolean
    get:
      tags:
        - User
      summary: Get user by user name
      description: |
        Some description of the operation.
        You can use `markdown` here.
      operationId: getUserByName
      parameters:
        - name: username
          in: path
          description: The name that needs to be fetched
          required: true
          schema:
            type: string
        - name: with_email
          in: query
          description: Filter users without email
          schema:
            type: boolean
      security:
        - main_auth:
            - 'read:users'
        - api_key: []
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
              example:
                username: user1
                email: user@example.com
        '403':
          description: Forbidden
        '404':
          description: User not found
    put:
      tags:
        - User
      summary: Updated user
      description: This can only be done by the logged in user.
      operationId: updateUser
      parameters:
        - name: username
          in: path
          description: The name that needs to be updated
          required: true
          schema:
            type: string
      security:
        - main_auth:
            - 'write:users'
      responses:
        '200':
          description: OK
        '400':
          description: Invalid user supplied
        '404':
          description: User not found
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/User'
          application/xml:
            schema:
              $ref: '#/components/schemas/User'
        description: Updated user object
        required: true
    delete:
      x-internal: true
      tags:
        - User
      summary: Delete user
      description: This can only be done by an internal admin.
      operationId: deleteUser
      parameters:
        - name: username
          in: path
          description: The username that needs to be deleted
          required: true
          schema:
            type: string
      security:
        - main_auth:
            - 'delete:users'
      responses:
        '204':
          description: OK
        '400':
          description: Invalid user supplied
        '404':
          description: User not found
  /echo:
    post:
      tags:
        - Echo
      summary: Echo test
      description: Receive the exact message you've sent
      operationId: echo
      security:
        - api_key: []
        - basic_auth: []
      responses:
        '200':
          description: OK
          headers:
            X-Rate-Limit:
              description: calls per hour allowed by the user
              schema:
                type: integer
                format: int32
            X-Expires-After:
              $ref: '#/components/headers/ExpiresAfter'
          content:
            application/json:
              schema:
                type: string
              examples:
                response:
                  value: Hello world!
            application/xml:
              schema:
                type: string
            text/csv:
              schema:
                type: string
      requestBody:
        content:
          application/json:
            schema:
              type: string
              example: Hello world!
          application/xml:
            schema:
              type: string
              example: Hello world!
        description: Echo payload
        required: true
  /wipe:
    x-internal: true
    post:
      tags:
        - Wipe
      summary: Wipe
      description: Wipes all data from the database
      operationId: wipe
      security:
        - api_key: []
        - basic_auth: []
      responses:
        '204':
          description: OK
          headers:
            X-Rate-Limit:
              description: calls per hour allowed by the user
              schema:
                type: integer
                format: int32
            X-Expires-After:
              $ref: '#/components/headers/ExpiresAfter'
  /admins:
    post:
      x-internal: true
      tags:
        - Admin
      summary: Create an admin
      description: This can only be done by an internal admin.
      operationId: createAdmin
      security:
        - main_auth:
            - 'create:admin'
      responses:
        '204':
          description: OK
        '400':
          description: Invalid user supplied
        '404':
          description: User not found
    get:
      x-internal: true
      tags:
        - Admin
      summary: List the admins
      operationId: listAdmins
      security:
        - main_auth:
            - 'read:admin'
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
              example:
                username: user1
                email: user@example.com
components:
  securitySchemes:
    main_auth:
      type: oauth2
      flows:
        implicit:
          authorizationUrl: 'http://example.com/api/oauth/dialog'
          scopes:
            'read:users': read users info
            'write:users': modify or remove users
    api_key:
      type: apiKey
      in: header
      name: api_key
    basic_auth:
      type: http
      scheme: basic
  schemas:
    Email:
      description: User email address
      type: string
      format: test
      example: john.smith@example.com
    User:
      type: object
      properties:
        username:
          description: User supplied username
          type: string
          minLength: 4
          example: John78
        firstName:
          description: User first name
          type: string
          minLength: 1
          example: John
        lastName:
          description: User last name
          type: string
          minLength: 1
          example: Smith
        email:
          $ref: '#/components/schemas/Email'
  headers:
    ExpiresAfter:
      description: date in UTC when token expires
      schema:
        type: string
        format: date-time
```

```yaml external
openapi: 3.0.2
info:
  version: 1.0.0
  title: Example.com
  termsOfService: 'https://example.com/terms/'
  contact:
    email: contact@example.com
    url: 'http://example.com/contact'
  license:
    name: Apache 2.0
    url: 'http://www.apache.org/licenses/LICENSE-2.0.html'
  x-logo:
    url: 'https://redocly.github.io/openapi-template/logo.png'
  description: >
    This is an **example** API to demonstrate features of OpenAPI specification

    # Introduction

    This API definition is intended to to be a good starting point for
    describing your API in

    [OpenAPI/Swagger
    format](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md).

    It also demonstrates features of
    [create-openapi-repo](https://github.com/Redocly/create-openapi-repo) tool
    and

    [Redoc](https://github.com/Redocly/Redoc) documentation engine. So beyond
    the standard OpenAPI syntax we use a few

    [vendor
    extensions](https://github.com/Redocly/Redoc/blob/master/docs/redoc-vendor-extensions.md).


    # OpenAPI Specification

    The goal of The OpenAPI Specification is to define a standard,
    language-agnostic interface to REST APIs which

    allows both humans and computers to discover and understand the capabilities
    of the service without access to source

    code, documentation, or through network traffic inspection. When properly
    defined via OpenAPI, a consumer can

    understand and interact with the remote service with a minimal amount of
    implementation logic. Similar to what

    interfaces have done for lower-level programming, OpenAPI removes the
    guesswork in calling the service.
externalDocs:
  description: Find out how to create a GitHub repo for your OpenAPI definition.
  url: 'https://github.com/Rebilly/generator-openapi-repo'
tags:
  - name: Echo
    description: Example echo operations
  - name: User
    description: Operations about user
servers:
  - url: 'http://example.com/api/v1'
  - url: 'https://example.com/api/v1'
paths:
  '/users/{username}':
    parameters:
      - name: pretty_print
        in: query
        description: Pretty print response
        schema:
          type: boolean
    get:
      tags:
        - User
      summary: Get user by user name
      description: |
        Some description of the operation.
        You can use `markdown` here.
      operationId: getUserByName
      parameters:
        - name: username
          in: path
          description: The name that needs to be fetched
          required: true
          schema:
            type: string
        - name: with_email
          in: query
          description: Filter users without email
          schema:
            type: boolean
      security:
        - main_auth:
            - 'read:users'
        - api_key: []
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
              example:
                username: user1
                email: user@example.com
        '403':
          description: Forbidden
        '404':
          description: User not found
    put:
      tags:
        - User
      summary: Updated user
      description: This can only be done by the logged in user.
      operationId: updateUser
      parameters:
        - name: username
          in: path
          description: The name that needs to be updated
          required: true
          schema:
            type: string
      security:
        - main_auth:
            - 'write:users'
      responses:
        '200':
          description: OK
        '400':
          description: Invalid user supplied
        '404':
          description: User not found
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/User'
          application/xml:
            schema:
              $ref: '#/components/schemas/User'
        description: Updated user object
        required: true
  /echo:
    post:
      tags:
        - Echo
      summary: Echo test
      description: Receive the exact message you've sent
      operationId: echo
      security:
        - api_key: []
        - basic_auth: []
      responses:
        '200':
          description: OK
          headers:
            X-Rate-Limit:
              description: calls per hour allowed by the user
              schema:
                type: integer
                format: int32
            X-Expires-After:
              $ref: '#/components/headers/ExpiresAfter'
          content:
            application/json:
              schema:
                type: string
              examples:
                response:
                  value: Hello world!
            application/xml:
              schema:
                type: string
            text/csv:
              schema:
                type: string
      requestBody:
        content:
          application/json:
            schema:
              type: string
              example: Hello world!
          application/xml:
            schema:
              type: string
              example: Hello world!
        description: Echo payload
        required: true
components:
  securitySchemes:
    main_auth:
      type: oauth2
      flows:
        implicit:
          authorizationUrl: 'http://example.com/api/oauth/dialog'
          scopes:
            'read:users': read users info
            'write:users': modify or remove users
    api_key:
      type: apiKey
      in: header
      name: api_key
    basic_auth:
      type: http
      scheme: basic
  schemas:
    Email:
      description: User email address
      type: string
      format: test
      example: john.smith@example.com
    User:
      type: object
      properties:
        username:
          description: User supplied username
          type: string
          minLength: 4
          example: John78
        firstName:
          description: User first name
          type: string
          minLength: 1
          example: John
        lastName:
          description: User last name
          type: string
          minLength: 1
          example: Smith
        email:
          $ref: '#/components/schemas/Email'
  headers:
    ExpiresAfter:
      description: date in UTC when token expires
      schema:
        type: string
        format: date-time

```

</details>


### Separate root API files

This is indicated when:
- There may be shared schemas between internal and external APIs.
- Internal parts are only paths.

We recommend our [multi-file OpenAPI structure](./multi-file-definitions.md) for organizing your API definitions.

This approach calls for making an additional root file (the root file is the file where the OpenAPI description begins).

In this instance, we rename our `openapi.yaml` to `internal.yaml` and also make an `external.yaml`. We remove paths from within that `external.yaml` file that we want removed.

Pay attention to the `internal.yaml` and `external.yaml` files.
These are the root files:

```shell
├── README.md
├── code_samples
│   └── ...
├── components
│   ├── ...
│   ├── schemas
│   │   └── ...
│   └── securitySchemes
│       └── ...
├── internal.yaml
├── external.yaml
└── paths
    ├── README.md
    ├── echo.yaml
    └── users@{username}.yaml
```

And this is the main change we make inside of those root files:

```yaml internal
paths:
  '/users/{username}':
    $ref: 'paths/users@{username}.yaml'
  /echo:
    $ref: paths/echo.yaml
  /wipe:
    $ref: paths/wipe.yaml
  /admins:
    $ref: paths/admins.yaml
```
```yaml external
paths:
  '/users/{username}':
    $ref: 'paths/users@{username}.yaml'
  /echo:
    $ref: paths/echo.yaml
```

#### Drawbacks

- You still have to maintain an extra file (but it's much easier than maintaining two separate complete API definitions).
- The approach only works if the granularity-level of "path item" works for your use case.

### Using a decorator

Redocly's API registry uses [OpenAPI-cli](../../openapi-cli.mdx) under the hood.

OpenAPI-cli is a very powerful tool that allows you [create custom plugins](../cli/custom-rules.md) to:
- create your own organization's linting rules
- transform your API definition during the bundle process (using decorators)

This approach uses decorators to transform your API definition during the bundle process.

There are three steps to accomplish this:
1. Mark paths and/or operations with the `x-internal: true` (where it is internal).
1. Add a custom plugin (see our `demo-plugin.js`).
1. Adjust your `.redocly.yaml` configuration file to register and use the plugin.

#### 1. Marking paths and operations with `x-internal: true`

```yaml Operation marked as internal
delete:
  # x-internal on the operation level (others in path item are not internal)
  x-internal: true
  tags:
    - User
  summary: Delete user
  description: This can only be done by an internal admin.
  operationId: deleteUser
  parameters:
    - name: username
      in: path
      description: The username that needs to be deleted
      required: true
      schema:
        type: string
  security:
    - main_auth:
        - 'delete:users'
  responses:
    '204':
      description: OK
    '400':
      description: Invalid user supplied
    '404':
      description: User not found
```

```yaml Path marked as internal
# x-internal at the path item level
x-internal: true
post:
  tags:
    - Wipe
  summary: Wipe
  description: Wipes all data from the database
  operationId: wipe
  security:
    - api_key: []
    - basic_auth: []
  responses:
    '204':
      description: OK
      headers:
        X-Rate-Limit:
          description: calls per hour allowed by the user
          schema:
            type: integer
            format: int32
        X-Expires-After:
          $ref: ../components/headers/ExpiresAfter.yaml
```

#### 2. Add a plugin

This example organizes the plugin into a `plugins` directory (you can name it anything though).
Therefore, to follow along, place this `demo-plugin.js` file inside of a `plugins` directory.
Here is the `demo-plugin.js` file contents:

```js demo-plugin.js
const id = 'demo';

/** @type {import('@redocly/openapi-cli').CustomRulesConfig} */
const decorators = {
  oas3: {
    'remove-internal-operations': () => {
      return {
        PathItem: {
          leave(pathItem, ctx) {
            // delete if the path itself is marked with x-internal
            if (pathItem['x-internal']) {
              delete ctx.parent[ctx.key];
            }

            // delete any operations inside of a path marked with x-internal
            const operations = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
            for (const operation of operations) {
              if (pathItem[operation] && pathItem[operation]['x-internal']) {
                delete pathItem[operation];
              }
            }

            // delete the path if there are no operations remaining in it
            if (Object.keys(pathItem).length === 0) {
              delete ctx.parent[ctx.key];
            }
          }
        }
      }
    },
  },
};

module.exports = {
  id,
  decorators,
};
```

```js With explanations
// Each plugin must have an id that is referenced in the .redocly.yaml file (look up above and see where "demo" is used).
const id = 'demo';

// This enables my IDE (VS Code) to use IntelliSense type completions.
/** @type {import('@redocly/openapi-cli').CustomRulesConfig} */
const decorators = {
  oas3: {
    // Each decorator has a name. We reference it in the .redocly.yaml file.
    // If we had a lot of decorators and rules in our plugin,
    // we would probably organize them into separate files.
    // Instead, we use an inline function here.
    'remove-internal-operations': () => {
      return {

        // We are inspecting each PathItem here.
        // The IntelliSense type completions are handy here, but we could "visit" Operation
        // and about 40+ other node types you can visit: https://github.com/Redocly/openapi-cli/blob/master/packages/core/src/types/oas3.ts#L537
        PathItem: {
          // The options here are to execute when the visitor enters or leaves the node as it traverses the tree.
          leave(pathItem, ctx) {
            // Checks if the path itself is marked with x-internal
            if (pathItem['x-internal']) {
              // Then delete the path. However, delete works on an object property, so we need to delete from the parent object's pathItem property.
              // ctx is context.
              delete ctx.parent[ctx.key];
            }

            // delete any operations inside of a path marked with x-internal
            const operations = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
            // The structure of the pathItem is that it may have operations as keys with the media type objects as their descriptions. We're going to check each operation key.
            for (const operation of operations) {
              if (pathItem[operation] && pathItem[operation]['x-internal']) {
                // This will delete only an operation. We can do this way because the operation is a property of the pathItem.
                delete pathItem[operation];
              }
            }

            // delete the path if there are no operations remaining in it
            if (Object.keys(pathItem).length === 0) {
              // In case all operations are removed from path items, we'll delete the path item itself.
              delete ctx.parent[ctx.key];
            }
          }
        }
      }
    },
  },
};

// This registers the id and decorators so that we can use our plugin.
module.exports = {
  id,
  decorators,
};
```

<div class="danger">
From a security perspective, explicitly allowing something is typically more secure than explicitly disallowing something.
Therefore, consider <code>x-external</code> vs. <code>x-internal</code> and adjust the decorators accordingly.
</div>

The example above covers paths and operations, but it doesn't cover specific schema properties.
Add another decorator, for example, `remove-internal-schema-properties`, to accomplish that.


#### 3. Register the plugin in `.redocly.yaml`

It requires making a change to your `.redocly.yaml` file to register your plugin and run it.

Pay attention to the `plugins` and `decorators` within the `lint` section.

```yaml
# See https://redoc.ly/docs/cli/configuration/ for more information.
apiDefinitions:
  main: openapi/openapi.yaml
lint:
  extends:
    - recommended
  plugins:
    - './plugins/demo-plugin.js'
  decorators:
    demo/remove-internal-operations: error

referenceDocs:
  htmlTemplate: ./docs/index.html
  theme:
    colors:
      primary:
        main: "#32329f"
```

Then, when you bundle the API, the decorator will remove the internal info.

```shell
openapi bundle
```

If you want to generate both external and internal bundles, you would run the command twice, but one time with additional arguments to skip the decorator execution.

```shell
# bundle for external users
openapi bundle -o dist/external.json

# bundle for internal users
openapi bundle --skip-decorator=demo/remove-internal-operations -o dist/internal.json
```

<details>
<summary>See how to reorganize for multiple decorators</summary>

In our example plugin above, we included our `remove-internal-operations` decorator definition as a closure directly in the plugin definition.
It is possible to define it in a separate file.
This may be useful when you have multiple custom decorators or rules to keep your code organized.

This shows how we split the original `demo-plugin.js` into two files with the new `demo-plugin.js` file streamlined.

```js demo-plugin.js
const RemoveInternalOperations = require('./decorators/remove-internal-operations');
const id = 'demo';

/** @type {import('@redocly/openapi-cli').CustomRulesConfig} */
const decorators = {
  oas3: {
    'remove-internal-operations': RemoveInternalOperations,
  },
};

module.exports = {
  id,
  decorators,
};
```

```js decorators/remove-internal-operations.js
module.exports = RemoveInternalOperations;

/** @type {import('@redocly/openapi-cli').OasDecorator} */
function RemoveInternalOperations() {
  return {
    PathItem: {
      leave(pathItem, ctx) {
        // delete if the path itself is marked with x-internal
        if (pathItem['x-internal']) {
          delete ctx.parent[ctx.key];
        }

        // delete any operations inside of a path marked with x-internal
        const operations = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
        for (const operation of operations) {
          if (pathItem[operation] && pathItem[operation]['x-internal']) {
            delete pathItem[operation];
          }
        }

        // delete the path if there are no operations remaining in it
        if (Object.keys(pathItem).length === 0) {
          delete ctx.parent[ctx.key];
        }
      }
    }
  }
};
```

This should work exactly as our original decorator example.
It will provide us a cleaner interface for our next example, to remove internal schema with another decorator.

</details>
<details>
<summary>Add remove internal schema properties decorator</summary>

We adjust the `demo-plugin.js` file, add the new decorator, and adjust the `.redocly.yaml` configuration file to use the decorator.

```js plugins/demo-plugin.js
const RemoveInternalOperations = require('./decorators/remove-internal-operations');
const RemoveInternalSchemaProperties = require('./decorators/remove-internal-schema-properties');
const id = 'demo';

/** @type {import('@redocly/openapi-cli').CustomRulesConfig} */
const decorators = {
  oas3: {
    'remove-internal-operations': RemoveInternalOperations,
    'remove-internal-schema-properties': RemoveInternalSchemaProperties,
  },
};

module.exports = {
  id,
  decorators,
};
```

```js plugins/decorators/remove-internal-schema-properties.js
module.exports = RemoveInternalSchemaProperties;

/** @type {import('@redocly/openapi-cli').OasDecorator} */
function RemoveInternalSchemaProperties() {
  return {
    SchemaProperties: {
      leave(properties) {
        for (const propertyName of Object.keys(properties)) {
          if (properties[propertyName]['x-internal']) {
            delete properties[propertyName];
          }
        }
      }
    }
  }
};
```

```yaml .redocly.yaml
# See https://redoc.ly/docs/cli/configuration/ for more information.
apiDefinitions:
  internal: openapi/internal.yaml
  main: openapi/external.yaml
lint:
  extends:
    - recommended
  plugins:
    - './plugins/demo-plugin.js'
  decorators:
    demo/remove-internal-operations: error
    demo/remove-internal-schema-properties: error

referenceDocs:
  htmlTemplate: ./docs/index.html
  theme:
    colors:
      primary:
        main: "#32329f"
```

Create a bundle for internal use (including all of the internal paths, operations and schema properties):

```shell
openapi bundle --skip-decorator=demo/remove-internal-operations --skip-decorator=demo/remove-internal-schema-properties -o dist/internal.json
```

In Redocly's API registry set a special environment variable `OPENAPI_CLI_BUNDLE_ARGS` with the value of `--skip-decorator=demo/remove-internal-schema-properties`.

<div class="success">
<code>SchemaProperties</code> is an object, so we use the <code>Object.keys()</code> method to iterate since we cannot iterate on an object directly.
</div>

You may also want to create a custom rule to make sure no `x-internal` properties are marked as required.

</details>
