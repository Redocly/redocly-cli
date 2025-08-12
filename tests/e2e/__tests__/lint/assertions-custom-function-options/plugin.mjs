export default async function plugin() {
  return {
    id: 'local',
    assertions: {
      checkWordsStarts: (value, opts, ctx) => {
        const regexp = new RegExp(`^${opts.words.join('|')}`);
        if (regexp.test(value)) {
          return [];
        }
        return [
          {
            message: `Should start with one of ${opts.words.join(', ')}`,
            location: ctx.baseLocation,
          },
        ];
      },
      checkWordsCount: (value, opts, ctx) => {
        const words = value.split(' ');
        if (words.length >= opts.min) {
          return [];
        }
        return [
          {
            message: `Should have at least ${opts.min} words`,
            location: ctx.baseLocation,
          },
        ];
      },
    },
  };
}
