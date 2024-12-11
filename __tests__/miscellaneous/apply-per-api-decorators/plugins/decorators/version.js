module.exports = sparkle;

function sparkle() {
  return {
    Info: {
      leave(target) {
        target.version = '1.0.0';
      },
    },
  };
}
