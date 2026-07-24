export default function plugin() {
  return {
    id: 'azure-apim',
    decorators: {
      oas3: {
        'remove-examples': RemoveExamples,
      },
    },
  };
}

/** @type {import('@redocly/cli').OasDecorator} */
function RemoveExamples() {
  return {
    Schema: {
      leave(Schema) {
        if (Schema['examples']) {
          delete Schema['examples'];
        }
      },
    },
    MediaType: {
      leave(MediaType) {
        if (MediaType['examples']) {
          delete MediaType['examples'];
        }
      },
    },
    Components: {
      leave(Components) {
        if (Components['examples']) {
          delete Components['examples'];
        }
      },
    },
  };
}
