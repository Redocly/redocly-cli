# API Health

Authors:

- [`adamaltman`](https://github.com/adamaltman) Adam Altman (Redocly)

## What this does and why

This set of configurable rules checks that an API conforms to expected health check standards.
Three rules are included and they check the following:

- `/health` endpoint is defined
- The `200` response uses the `application/health+json` media type
- The response contains the mandatory `status` property

Source: [Proposed Health Check Response Format for HTTP APIs](https://datatracker.ietf.org/doc/html/draft-inadarei-api-health-check-06).

## Code

The first rule checks that a health path is defined.

```yaml
rule/health-endpoint:
  subject:
    type: Paths
  assertions:
    required:
      - '/health'
  message: API must have a health endpoint.
```

The second rule checks that the response uses the `application/health+json` media type.

It uses a `where` clause to target the check to the successful health response.

```yaml
rule/health-media-type:
  subject:
    type: MediaTypesMap
  assertions:
    const: application/health+json
  where:
    - subject:
        type: PathItem
        matchParentKeys: '/health'
      assertions:
        defined: true
    - subject:
        type: Response
        matchParentKeys: '200'
      assertions:
        defined: true
  message: API Health response has media type `application/health+json`
  severity: error
```

The final rule checks that the response has the required `status` property.

It uses a `where` clause to target the check to the successful health response.

```yaml
rule/health-schema-status:
  where:
    - subject:
        type: PathItem
        matchParentKeys: '/health'
      assertions:
        defined: true
    - subject:
        type: Response
        matchParentKeys: '200'
      assertions:
        defined: true
  subject:
    type: SchemaProperties
  assertions:
    required:
      - status
  message: API Health response must have a required property `status`
  severity: error
```

## Examples

The following OpenAPI passes the configurable rules.

```yaml
openapi: 3.1.0
info:
  title: Sample health check
  version: demo
paths:
  /health:
    get:
      summary: Health check
      description: Check the health of our API.
      operationId: Health
      responses:
        '200':
          description: Pass or warn
          content:
            application/health+json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    description: The status of the API.
                    enum:
                      - pass
                      - warn
        '400':
          description: Fail
          content:
            application/health+json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    description: The status of the API.
                    enum:
                      - fail
```

Not having the `/health` path defined or not have the `status` property or `application/health+json` response media type defined result in problems.

## References

Inspired by the expired draft of a health check standard: https://datatracker.ietf.org/doc/html/draft-inadarei-api-health-check-06
