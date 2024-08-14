module.exports = async function () {
  return {
    id: 'test-plugin',
    rules: {
      oas3: {
        'operation-3xx-response': 'warn',
      },
    },
  };
}
