import ValidateMarkdown from './rule-validate-markdown.js';

export default function plugin() {
  return {
    id: 'openapi-markdown',
    rules: {
      oas3: {
        validate: ValidateMarkdown,
      },
    },
  };
}
