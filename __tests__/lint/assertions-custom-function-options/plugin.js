module.exports = {
  id: 'local',
  assertions: {
    checkWordsStarts: (value, opts, location) => {
      const regexp = new RegExp(`^${opts.words.join('|')}`);
      if (regexp.test(value)) {
        return [];
      }
      return [{ message: `${value} should start with one of ${opts.words.join(', ')}`, location }];
    },
    checkWordsCount: (value, opts, location) => {
      const words = value.split(' ');
      if (words.length >= opts.min) {
        return [];
      }
      return [{ message: `${value} should have at least ${opts.min} words`, location }];
    },
  },
};
