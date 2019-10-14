# Revalid ruleset configuration

## Disabling and configuring rules
All of the following rules are configurable in terms of disabling or changing their severity. In order to update given rule, you should modify (or create) the `revalid.config.json` file in the directory from which you are going to run the Revalid.

If you are creating it from scratch, you might also want to enable/disable codeframe for the full output.

Below is the basic structure of this file:

```json
{
    "enableCodeframe": true,
    "rules": {
      "no-extra-fields": "off",
      "license": {
        "url": "on"
      },
      "license-required": {
        "level": "warning"
      },
      "unique-parameter-names": {
        "level": "error",
      },
      "no-unused-schemas": "off"
    }
}
```

## Ruleset overview

Below you can find a list of the all currently supported rules. To change your settings for given rule, just add or modify corresponding item in the `rules` section of the `revalid.config.json` in your working directory.

### api-servers
OpenAPI servers must be present and be a non-empty array.

### path-param-exists
Each path parameter in the `parameters` section must be present in the path string.

### license-url
License, if provided within `info` section must provide `url` field.

### no-extra-fields
By default, custom fields, not defined within OpenAPI specification can be included only using `x-` prefix. This rule enforces such policy.

### no-unused-schemas
It might be a bad sign if some of the schemas from the `components` section are not used anywhere. This checks for such scenarios.

### operation-2xx-response
When designing an API it's usually expected to do something succesfully, although it might fail. So, this rule validates, that there is at least one response in the operation with a 2xx status code.

### operation-description
This rule enforces to provide `description` field in `operation`s as within large definition it becomes really easy to lose track of things.

### operation-operationId
Enforce presence of the `operationId` field in each `operation`.

### operation-operationId-unique
`operationId`s are expected to be unique to really identify operations. This rule checks this principle.

### operation-tags
The `tags` field must be present and be a non-empty array in each `operation`.

### path-declarations-must-exist
Within the `operation` path definition you can define path parametrs. If you do so, each declaration of the parameter name within path must be a non-null string. For example, `/api/user/{userId}/profie` is a valid definition with `userId` parameter, but `/api/user/{}/profile` is not.

### path-keys-no-trailing-slash
Generally, it is considered less confusing if you do not have trailing slashes in your paths.  Also, it depends on tooling are `example.com/api/users` and `example.com/api/users/` are treated in the same way, so we suggest you to be consistent on this page.

### provide-contact
Info object must contain `contact` field.

Most of the APIs are not perfect, so there is something useful for your users to know, who can help in case of problems.

### servers-no-trailing-slash
Server URL must not have a trailing slash.

It depends on tooling are `example.com` and `example.com/` are treated in the same way. In the worst case, the latter option when conjuncted with operations paths migth result into `example.com//api/users`.

### unique-parameter-names
Parameters in `operation` objects must be `unique` definition wide.

### oas3-schema
This rule enforces the structural validation of the OpenAPI definitions according to the OpenAPI Specification 3.0.2. It can be fine-tuned to disable or change message level for each specific type of the OpenAPI Objects. For example, if you have custom structure of the `servers` object, what you can do to prevent error messages regarding it is to update your `revalid.config.json` to the following pattern:

```json
{
  ... your configuration
  "rules": {
    ...other rules,
    "oas3-schema": {
      "servers": {
        "level": "warning"
      }
    }
  }
}
```
or even totally disable:
```json
{
  ... your configuration
  "rules": {
    ...other rules,
    "oas3-schema": {
      "servers": "off"
    }
  }
}
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
| documentation | [OpenAPI External Documentation Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#externalDocumentationObject) |
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


## Linting rules
### suggest-possible-refs
It is not totally uncommon to have a bad `$ref` in your definition. For example, instead of `#components/schemas/User` one might type `#components/schemas/Use`.

With this rule enabled, Revalid will try to find the closest possible valid `$ref` address in the definition.
