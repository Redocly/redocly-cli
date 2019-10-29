# Rules

All supported rules are listed below. To change your settings for any given rule, just add or modify a corresponding item in the `rules` section of the `.openapi-cli.yaml` in your working directory.

### api-servers
OpenAPI servers must be present and be a non-empty array.

### camel-case-names
Schemas and parameters names should be in camelCase. This rule does a lot of string comparison and matching operations, so it may increase time of validation significantly.

### path-param-exists
Each path parameter in the `parameters` section must be present in the path string.

### license-url
License, if provided within the `info` section, must provide the `url` field.

### no-unused-schemas
Unused schemas defined in `components` may indicate a mistake. This rule checks for that scenario.

### operation-2xx-response
When designing an API it's usually expected to do something successfully, although it might fail. So, this rule validates, that there is at least one response in the operation with a 2xx status code.

### operation-description
This rule enforces that a `description` field is included in `operation`s definitions.

### operation-operationId
Enforce presence of the `operationId` field in each `operation`.  This is a highly recommended practice.

### operation-operationId-unique
The `operationId`s are expected to be unique to really identify operations. This rule checks this principle.

### operation-tags
The `tags` field must be present and be a non-empty array in each `operation`.

### path-declarations-must-exist
Define path parameters within the `operation` path definition. Each declaration of the parameter name within path must be a non-empty string. For example, `/api/user/{userId}/profie` is a valid definition with the `userId` parameter, but `/api/user/{}/profile` is not.

### path-keys-no-trailing-slash
Endpoints are less confusing without trailing slashes in the path.  Also, tooling may treat `example.com/api/users` and `example.com/api/users/` in the same way, so we suggest you be consistent in your API definition.

### provide-contact
Info object must contain the `contact` field.

APIs are not perfect, and the contact field lets users know who can help.

### servers-no-trailing-slash
The server URL must not have a trailing slash.

Tooling may treat `example.com` and `example.com/` in the same way. In the worst case, the latter option when joined with the operations paths might result in `example.com//api/users`.

### unique-parameter-names
Parameters in `operation` objects must be `unique` definition wide.

### oas3-schema
This rule enforces the structural validation of the OpenAPI definitions according to the OpenAPI Specification 3.0.2. It can be fine-tuned to disable or change the message level for each specific type of OpenAPI Objects (we call those sub-rules). For example, if you have a custom structure of the `servers` object, you prevent related error messages by updating your `.openapi-cli.yaml` to the following pattern:

```yaml
codeframes: off
rules: 
  ...other rules
  oas3-schema: 
    servers:
      level: warning    
```
Or even totally disabled:
```yaml
codeframes: off
rules: 
  ...other rules
  oas3-schema: 
    servers: off
```

Below, you can find the table of available sub-rules you can update:

| Sub-rule name | OpenAPI Object it corresponds to|
|---|---|
| root | [OpenAPI Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#oasObject) |
| info | [Open API Info Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#infoObject) |
| contact | [Open API Contact Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#contactObject) |
| discriminator | [Open API Discriminator Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#discriminatorObject) |
| encoding | [Open API Encoding Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#encodingObject) |
| example | [OpenAPI Example Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#exampleObject) |
| external-docs | [OpenAPI External Documentation Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#externalDocumentationObject) |
| header | [OpenAPI Header Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#headerObject) |
| license | [OpenAPI License Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#licenseObject) |
| link | [OpenAPI Link Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#linkObject) |
| media-object | [OpenAPI Media Type Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#mediaTypeObject) | 
| operation | [OpenAPI Operation Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#operationObject) |
| parameter | [OpenAPI Parameter Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#parameterObject) |
| path | [OpenAPI Path Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#pathItemObject) |
| request-body | [OpenAPI Request Body Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#requestBodyObject) |
| response | [OpenAPI Response Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#responseObject) |
| schema | [OpenAPI Schema Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#schemaObject) |
| secuirty-schema | [OpenAPI Security Scheme Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#securitySchemeObject)|
| auth-code-flow | [Open API Flow Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#oauthFlowObject)|
| client-creds-flow | [Open API Flow Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#oauthFlowObject)|
| implicit-flow | [Open API Flow Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#oauthFlowObject)|
| password-flow | [Open API Flow Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#oauthFlowObject)|
| server | [OpenAPI Server Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#serverObject) |
| server-variable | [OpenAPI Server Variable Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#serverVariableObject) |
| tag | [OpenAPI Tag Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#tagObject) |
| xml | [OpenAPI XML Obejct](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#xmlObject) |

#### no-extra-fields
By default, custom fields, not defined within OpenAPI specification can be included only using `x-` prefix. This rule enforces such policy.


## Linting rules
### suggest-possible-refs
It is not uncommon to have a bad `$ref` in your definition. For example, instead of `#components/schemas/User` one might type `#components/schemas/Use`.

With this rule enabled, @redocly/openapi-cli will try to find the closest possible valid `$ref` address in the definition.
