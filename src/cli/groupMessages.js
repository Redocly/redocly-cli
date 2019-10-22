const errorBelongsToGroup = (error, group) => error.message === group.message
    && error.path.join('/') === group.path.join('/')
    && error.severity === group.severity
    && error.location.startIndex === group.location.startIndex
    && error.location.endIndex === group.location.endIndex
    && error.location.possibleAlternate === group.location.possibleAlternate;

const errorAlreadyInGroup = (error, group) => group
  .pathStacks
  .filter(
    (stack) => JSON.stringify(stack) === JSON.stringify(error.pathStack),
  ).length > 0;

const groupFromError = (error) => ({
  message: error.message,
  location: error.location,
  path: error.path,
  codeFrame: error.codeFrame,
  value: error.value,
  file: error.file,
  severity: error.severity,
  enableCodeframe: error.enableCodeframe,
  target: error.target,
  possibleAlternate: error.possibleAlternate,
  fromRule: error.fromRule,
  pathStacks: error.pathStack.length !== 0 ? [error.pathStack] : [],
});

const addErrorToGroup = (error, group) => {
  if (error.pathStack.length !== 0 && !errorAlreadyInGroup(error, group)) {
    group.pathStacks.push(error.pathStack);
  }
  return true;
};


export const groupErrors = (errors) => {
  const groups = [];
  for (let i = 0; i < errors.length; i += 1) {
    let assigned = false;
    for (let j = 0; j < groups.length; j += 1) {
      if (errorBelongsToGroup(errors[i], groups[j])) {
        assigned = addErrorToGroup(errors[i], groups[j]);
        break;
      }
    }
    if (!assigned) groups.push(groupFromError(errors[i]));
  }
  return groups;
};

export const groupByFiles = (result) => {
  const fileGroups = {};
  result.forEach((row) => {
    if (fileGroups[row.file]) {
      fileGroups[row.file].push(row);
    } else {
      fileGroups[row.file] = [row];
    }
  });
  return fileGroups;
};
