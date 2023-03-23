module.exports = {
  id: 'local',
  assertions: {
    checkWordsStarts: (value, opts, assertionContext) => {
      const regexp = new RegExp(`^${opts.words.join('|')}`);
      if (regexp.test(value)) {
        return [];
      }
      return [
        {
          message: `Should start with one of ${opts.words.join(', ')}`,
          location: assertionContext.baseLocation,
        },
      ];
    },
    checkWordsCount: (value, opts, assertionContext) => {
      const words = value.split(' ');
      if (words.length >= opts.min) {
        return [];
      }
      return [
        {
          message: `Should have at least ${opts.min} words`,
          location: assertionContext.baseLocation,
        },
      ];
    },
  },
};
