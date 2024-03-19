# `apis`

<!--Introduction
--------------------------
Explain what the option is or does.
For example, Developer onboarding means allowing developers to register apps and manage credentials.-->

## Introduction

If your project contains multiple APIs, the `apis` configuration section allows you to set up different rules and settings for different APIs.


## Options

{% table %}

- Option
- Type
- Description

---

- `{name}@{version}`
- [API object](#api-object)
- Required. Each API needs a name and optionally a version.

{% /table %}

### API object

{% table %}

- Option
- Type
- Description

---

- root
- string
- Required. Path to the root API description file.

---

- rules
- [Rules object](./rules.md)
- Additional rule configuration for this API.

---

- decorators
- [Decorators object](./decorators.md)
- Additional decorator configuration for this API.

{% /table %}


## Examples

<!--Related options
-------------------

Include a bulleted list of related reference documentation links.-->

## Related options

<!--Resources
-------------

Include a bulleted list of conceptual or how-to documentation links that are related to topic referenced.-->

## Resources

