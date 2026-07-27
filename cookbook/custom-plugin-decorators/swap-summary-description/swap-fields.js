export default function plugin() {
  return {
    id: 'swap-fields',
    decorators: {
      oas3: {
        'summary-description': () => {
          return {
            Operation: {
              leave(target) {
                let description = '';
                let summary = '';
                if (target.description) {
                  description = target.description;
                }
                if (target.summary) {
                  summary = target.summary;
                }

                // only swap them if there is some description content
                if (description.length > 0) {
                  target.description = summary;
                  target.summary = description;
                }
              },
            },
          };
        },
      },
    },
  };
}
