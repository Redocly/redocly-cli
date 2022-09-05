module.exports = {
  id: 'local',
  assertions: {
    checkWordsStarts: (value, opts, location) => {
      const regexp = new RegExp(`^${opts.words.join("|")}`)
      if (regexp.test(value)) {
        return { isValid: true };
      }
      return { isValid: false, location };
    },
    checkWordsCount: (value, opts, location) => {
      const words = value.split(" ");
      if (words.length >= opts.min) {
        return { isValid: true };
      }
      return { isValid: false, location };
    },
  },
};
