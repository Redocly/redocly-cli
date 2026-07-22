import updateExampleDates from './decorator.js';

export default function plugin() {
  return {
    id: 'dates-plugin',
    decorators: {
      oas3: {
        'update-example-dates': updateExampleDates,
      },
    },
  };
}
