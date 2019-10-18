export default (config, rulePath) => {
  if (config && Object.keys(config).indexOf(rulePath) !== -1 && (config[rulePath] === 'off' || config[rulePath] === false)) return false;
  return true;
};
