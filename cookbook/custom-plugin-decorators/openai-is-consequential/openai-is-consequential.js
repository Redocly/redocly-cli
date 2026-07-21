export default function plugin() {
  return {
    id: 'openai-plugin',
    decorators: {
      oas3: {
        'is-consequential': OpenAIConsequential,
      },
    },
  };

  /** @type {import('@redocly/cli').OasDecorator} */
  function OpenAIConsequential() {
    return {
      PathItem(PathItem) {
        if (PathItem['get']) {
          PathItem['get']['x-openai-isConsequential'] = true;
        }
      },
    };
  }
}
