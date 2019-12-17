# Transformers

## Rationale

By default, custom visitors are run after the built-in ones. However, there might appear such situation, when the input data should be mutated before applying default rules and/or bundling. For this case, you might want to run certain custom visitors before in-built visitors. 

You can do it with `transformers` visitors.

## Usage

To create a visitor which will run before the default ones you should define a parameter `transformers` in your `.openapi-cli.yaml` config file and pass it a path to the JavaScript file similar to one you use for usual [custom visitors](CUSTOM_VISITORS.md).

The only difference between `customRules` and `transformers` is the execution order. `customRules` are run after the default visitors and `transformers` are run before them.