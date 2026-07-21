# Rules for enforcing a deprecation strategy

Authors:

- `@jeremyfiel` Jeremy Fiel (ADP)

## What this does and why

`Deprecated` services SHOULD define a standard set of headers to communicate `Deprecation` and `Sunset` information.
There SHOULD also exist a `Link` header to inform the consumer where the service location has been moved to, if any.

There are three parts to a deprecation strategy.
Defining _when_ (`deprecation`) the service will be deprecated, the `sunset` date of the service for it to be completely turned off, and a `link` to where a replacement service may exist.
We use these RFC standards to define these header fields:

- [RFC7231 - Date/Time Formats](https://datatracker.ietf.org/doc/html/rfc7231#section-7.1.1.1)
- [RFC8288 - Web Linking](https://datatracker.ietf.org/doc/html/rfc8288)
- [RFC8594 - HTTP Sunset Header Field](https://datatracker.ietf.org/doc/html/rfc9745/)
- [RFC9651 - Dates] (https://datatracker.ietf.org/doc/html/rfc9651/#section-3.3.7)
- [RFC 9745 - HTTP Deprecation Header Field](https://datatracker.ietf.org/doc/html/rfc9745/)

### 2XX responses

_while the service remains active_

- We must define the requirement for the `headers` map to exist in a `2XX` response
- We define the required headers: `deprecation`, `sunset`, `link`

### 410 Gone response

_the service is no longer available_

- A deprecated service must define a `410` response
- We must define the requirement for the `headers` map to exist
- After a service has been deprecated, the `deprecation` header must not be provided.
- A `sunset` header to indicate when the service was removed and a `link` header to indicate where a new service can be found

## Code

Add this to the `rules` section of your `redocly.yaml`:

```yaml
rules:
  rule/response-2XX-deprecated-must-define-headers:
  severity: warn
  message: Deprecated endpoints MUST respond with standard headers
  where:
    - subject:
        type: Operation
        property: deprecated
      assertions:
        defined: true
        const: true
  subject:
    type: Response
    matchParentKeys: '2([\d]+){2}'
  assertions:
    required:
      - headers

rule/response-2XX-deprecated-must-use-standard-headers:
  severity: warn
  message: 'Deprecated endpoints MUST respond with "Sunset", "Deprecation", and "Link" standard headers'
  where:
    - subject:
        type: Operation
        property: deprecated
      assertions:
        defined: true
        const: true
    - subject:
        type: Response
        matchParentKeys: '2([\d]+){2}'
      assertions:
        required:
          - headers
  subject:
    type: HeadersMap
  assertions:
    required:
      - Deprecation
      - Sunset
      - Link

rule/operation-deprecated-must-define-410-response:
  severity: warn
  message: Deprecated endpoints MUST define a 410 response
  where:
    - subject:
        type: Operation
        property: deprecated
      assertions:
        defined: true
        const: true
  subject:
    type: Responses
  assertions:
    required:
      - '410'

rule/response-410-deprecated-must-define-headers:
  severity: warn
  message: Deprecated endpoints MUST respond with standard headers
  where:
    - subject:
        type: Operation
        property: deprecated
      assertions:
        defined: true
        const: true
  subject:
    type: Response
    matchParentKeys: '410'
  assertions:
    required:
      - headers

rule/response-410-deprecated-must-define-standard-headers:
  severity: warn
  message: 'Deprecated endpoints MUST respond with "Sunset" and "Link" standard headers after "Deprecation" date value has been exceeded'
  where:
    - subject:
        type: Operation
        property: deprecated
      assertions:
        defined: true
        const: true
    - subject:
        type: Response
        matchParentKeys: '410'
      assertions:
        required:
          - headers
  subject:
    type: HeadersMap
  assertions:
    required:
      - 'Sunset'
      - 'Link'

rule/response-410-deprecated-must-not-define-deprecation-header:
  severity: warn
  message: 'Deprecated endpoints 410 response MUST NOT define "Deprecation" header'
  where:
    - subject:
        type: Operation
        property: deprecated
      assertions:
        defined: true
        const: true
    - subject:
        type: Response
        matchParentKeys: '410'
      assertions:
        required:
          - headers
  subject:
    type: HeadersMap
  assertions:
    disallowed:
      - 'Deprecation'
```

## Examples

```yaml
#invalid
openapi: 3.1.0
info:
  title: Redocly Cafe - deprecated endpoints
  version: 0.0.0
paths:
  '/menu-items':
    summary: legacy menu items endpoint, replaced by /menu
    deprecated: true
    responses:
      '200':
        description: OK
        content:
          'application/json':
            schema: {}
```

```yaml
# valid
openapi: 3.1.0
info:
  title: Redocly Cafe - deprecated endpoints
  version: 0.0.0
paths:
  '/menu-items':
    summary: legacy menu items endpoint, replaced by /menu
    deprecated: true
    parameters: []
    responses:
      '200':
        description: OK
        headers:
          deprecation:
            schema:
              type: string
            examples:
              deprecation_date:
                summary: A Structured Field Value as defined in Section 3.3.7 of RFC9651[5].
                value: '@1688169599'
          sunset:
            description: For historical reasons the Sunset HTTP header field uses a different data type for date than the Deprecation header field
            schema:
              type: string
            examples:
              sunset_date:
                summary: An HTTP-date timestamp, as defined in Section 7.1.1.1 of [RFC7231][4], and SHOULD be a timestamp in the future.
                value: Sun, 30 Jun 2024 23:59:59 GMT
          link:
            schema:
              type: string
            examples:
              link_value:
                value: <https://api.cafe.redocly.com/menu>; rel=alternate; title='the menu api'
        content:
          'application/json':
            schema: {}
      '410':
        description: Gone
        headers:
          sunset:
            description: Please note that for historical reasons the Sunset HTTP header field uses a different data type for date than the Deprecation header field
            schema:
              type: string
            examples:
              sunset_date:
                summary: An HTTP-date timestamp, as defined in Section 7.1.1.1 of [RFC7231][4], and SHOULD be a timestamp in the future.
                value: Sun, 30 Jun 2024 23:59:59 GMT
          link:
            schema:
              type: string
            examples:
              link_value:
                value: <https://api.cafe.redocly.com/menu>; rel=alternate; title='the menu api'
        content:
          'application/json':
            schema: {}
```
