module.exports = function plugin() {
  return { id: 'acme', assertions: { isEmptyArray: () => [] } };
};
