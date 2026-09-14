module.exports = function jsPlugin() {
  return {
    id: 'js-plugin',
    rules: {
      oas3: {
        marker: () => ({
          Info(_info, { report, location }) {
            report({ message: 'js-plugin loaded', location });
          },
        }),
      },
    },
  };
};
