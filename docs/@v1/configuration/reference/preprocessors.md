# `preprocessors`

## Introduction

Preprocessors are similar to decorators and follow the same structure and operation, but they run before the validation/linting step rather than after.

Running before the validation/linting step makes them brittle because the document may not be valid, and the extra processing step can cause performance impacts. We recommend looking for alternative approaches to preprocessing.

Some advanced use cases do require preprocessing, which is why the functionality is provided for those users.

Refer to the [`decorator` configuration options](./decorators.md) documentation for details; the options available are the same in both the `decorators` and `preprocessor` sections of the configuration file.

## Related options

- [decorators](./decorators.md) offer some transformations for your OpenAPI documents.
- [plugins](./plugins.md) allow code extensions to extend the existing functionality.

## Resources

- [Custom plugins](../../custom-plugins/index.md) offer a way to extend the functionality of Redocly.
