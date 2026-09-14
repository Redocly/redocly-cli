module.exports = function cjsPlugin() {
  return {
    id: 'cjs-plugin',
    rules: {
      oas3: {
        marker: () => ({
          Info(_info, { report, location }) {
            report({ message: 'cjs-plugin loaded', location });
          },
        }),
      },
    },
  };
};
