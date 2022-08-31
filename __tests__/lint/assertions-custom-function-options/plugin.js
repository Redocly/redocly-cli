
module.exports = {
  id: 'local',
  assertions: {
    checkLength: (opts, value, location) => {
      if (value.length < opts.min) {
        return { isValid: false, location };
      }
      return { isValid: true };
    },
  },
};
