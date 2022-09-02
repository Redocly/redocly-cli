module.exports = {
  id: 'local',
  assertions: {
    checkLength: (value, opts, location) => {
      if (value.length < opts.min) {
        return { isValid: false, location };
      }
      return { isValid: true };
    },
  },
};
