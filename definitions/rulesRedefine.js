module.exports = (definitionName, node, validators) => {
  switch (definitionName) {
    case 'OpenAPIParameter':
      if (node && Object.keys(node).length === 1 && node.description) {
        return Object.keys(validators)
          .filter((key) => !['in', 'name'].includes(key))
          .reduce((obj, key) => {
            obj[key] = validators[key];
            return obj;
          }, {});
      }
      return validators;
    default:
      return validators;
  }
};
