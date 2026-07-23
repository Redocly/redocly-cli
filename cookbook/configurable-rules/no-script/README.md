# Detect `<script>` tags in Markdown descriptions

Authors:

- [`@adamaltman`](https://github.com/adamaltman), Adam Altman (Redocly)
- [`@lornajane`](https://github.com/lornajane), Lorna Mitchell (Redocly)

## What this does and why

Detects use of `<script>` tags in Markdown description fields. Since Markdown also supports HTML, if you are bringing APIs in and displaying them then you probably want to be sure that script tags are not included since they can include harmful content.

## Code

In `redocly.yaml`, configure the rule like this:

```yaml
rules:
  rule/no-script-tags-in-markdown:
    subject:
      type: any
      property: description
    assertions:
      notPattern: '<script'
    severity: warn
    message: Markdown descriptions should not contain script tags.
```

This will pick up the contents of any `description` field in an OpenAPI file and warn you with a coherent message if there's a script tag found.

## Examples

Here's a mini OpenAPI description, with a script tag in the `info.description` field:

```yaml
openapi: 3.1.0
info:
  title: Redocly Cafe
  description: Manage the cafe menu and orders with this excellent <script>alert("Tricked you!");</script> API
paths: {}
```

When you lint this OpenAPI file with the `rule/no-script-tags-in-markdown` rule, you'll see a warning:

```text
Markdown descriptions should not contain script tags.
```

## References

Inspired by the Spectral rule [no-script-tags-in-markdown](https://docs.stoplight.io/docs/spectral/4dec24461f3af-open-api-rules#no-script-tags-in-markdown).
