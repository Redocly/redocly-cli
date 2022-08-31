module.exports = {
  id: 'local',
  assertions: {
    checkLength: (opts, value, location) => {
      if (value.length < 10) {
        return { isValid: false, location };
      }
      return { isValid: true };
    },
  },
};
