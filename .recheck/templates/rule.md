# {{ inline type="plain" }}

{{ inline }}

{{ optional }}
{% admonition type="warning" name="Deprecated" %}
{{ inline }}
{% /admonition %}
{{ /optional }}

{{ repeat }}
{{ one-of }}
| OAS | Compatibility |
| --- | ------------- |
| 2.0 | {{ one-of enum=["✅", "❌"] }} |
| 3.0 | {{ one-of enum=["✅", "❌"] }} |
| 3.1 | {{ one-of enum=["✅", "❌"] }} |
| 3.2 | {{ one-of enum=["✅", "❌"] }} |
---
| AsyncAPI | Compatibility |
| -------- | ------------- |
| 2.6      | {{ one-of enum=["✅", "❌"] }} |
| 3.0      | {{ one-of enum=["✅", "❌"] }} |
---
| Arazzo | Compatibility |
| ------ | ------------- |
| 1.x    | {{ one-of enum=["✅", "❌"] }} |
---
| Open-RPC | Compatibility |
| -------- | ------------- |
| 1.x      | {{ one-of enum=["✅", "❌"] }} |
---
| Overlay | Compatibility |
| ------- | ------------- |
| 1.x     | {{ one-of enum=["✅", "❌"] }} |
{{ /one-of }}
{{ /repeat }}

{{ optional }}
```mermaid
{{ inline }}
```
{{ /optional }}

## API design principles

{{ blocks min=1 }}

## Configuration

| Option                    | Type         | Description  |
| ------------------------- | ------------ | ------------ |
| {{ inline type="plain" }} | {{ inline }} | {{ inline }} | {{ repeat }}

{{ blocks allowSubHeadings=true }}

## Examples

{{ blocks allowSubHeadings=true }}

{{ optional }}
## Related rules

- [{{ inline type="plain" }}]({{ inline pattern="\\.md$" }}) {{ repeat }}

{{ /optional }}

## Resources

- [{{ inline }}]({{ inline }}) {{ repeat }}
