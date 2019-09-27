export const isRuleEnabled = (config, rulePath) => {
  if (config && config[rulePath] && (config[rulePath] === 'off' || config[rulePath] === false)) return false;
  return true;
};


export const test = () => {};
