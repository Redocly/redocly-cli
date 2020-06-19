# Transformers

> NOTE: this features is experimental. Modifying your tree may break codeframes in errors

## Rationale

By default, custom visitors are run after the built-in ones. However, there might appear such situation, when the input data should be mutated before applying default rules and/or bundling. For this case, you might want to run certain custom visitors before in-built visitors.

You can do it with `transformers` visitors.

## Usage

TBD