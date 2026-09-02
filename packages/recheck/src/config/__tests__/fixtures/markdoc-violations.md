# Markdoc violations fixture

Every section below exercises exactly one violation class from
`MARKDOC_VIOLATION_CLASSES` (config/presets/markdoc.ts), in isolation, so
`preset-markdoc.test.ts` can enumerate them one by one. See that file's own
comments for why each snippet doesn't ALSO trip a neighboring class.

## Missing required attribute (missing-required)

{% admonition %}
Back up your data before running this migration.
{% /admonition %}

## Enum violation (enum)

{% admonition type="information" %}
Use one of the four documented admonition types, not a made-up fifth one.
{% /admonition %}

## Attribute bareword value (attribute-bareword)

{% admonition type=info %}
Quote every attribute value; an unquoted identifier is a parse error.
{% /admonition %}

## Wrong attribute type (wrong-type)

{% card title="Example" lineClamp="two" %}
The line-clamp attribute expects a number, not this string.
{% /card %}

## Unknown attribute (unknown-attr)

{% admonition type="info" bogus="oops" %}
This tag carries an attribute the schema has never heard of.
{% /admonition %}

## Duplicate attribute (duplicate-attribute)

{% admonition type="info" type="danger" %}
Setting the same attribute twice is a mistake, not an override.
{% /admonition %}

## Primary value on a tag with no primary attribute (primary-unknown-attribute)

{% tabs "extra" %}
{% tab label="macOS" %}
Nothing platform-specific here.
{% /tab %}
{% /tabs %}

## Primary bareword value (primary-bareword)

{% if maybe %}
A conditional that never quotes its condition.
{% /if %}

## Malformed tag body (malformed)

{% admonition
{% /admonition %}

## Close tag carrying an attribute (close-tag-attributes)

{% admonition type="warning" %}
Closing tags never take attributes in real Markdoc.
{% /admonition class="oops" %}

## Unknown tag name (unknown-tag)

{% mysteryWidget foo="bar" /%}

## Unclosed tag (unclosed)

{% step id="setup" %}
This step is opened here but never closed before the document ends.

## Orphaned close tag (orphaned)

{% /toggle %}

## Crossed tag pairs (crossed)

{% card title="Nested" %}
{% admonition type="info" %}
These two tags close in the wrong order relative to each other.
{% /card %}
{% /admonition %}

## Self-closing tag missing its slash (void-missing-slash)

{% img src="one.png" alt="First image" %}

## Self-closing tag used with an explicit close (self-closing-with-close)

{% img src="two.png" alt="Second image" %}
A caption that pretends img needs a closing tag.
{% /img %}
