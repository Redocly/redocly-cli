module.exports = addVersion;

function addVersion() {
  return {
    Info: {
      leave(target) {
        target.version = '1.0.0';
      },
    },
  };
}
