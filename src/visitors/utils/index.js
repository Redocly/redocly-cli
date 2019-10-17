export default (config, rulePath) => {
  if (config && config[rulePath] && (config[rulePath] === 'off' || config[rulePath] === false)) return false;
  return true;
};
