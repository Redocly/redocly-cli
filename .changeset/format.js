export const getReleaseLine = async (changeset, _type) => {
  const [firstLine, ...futureLines] = changeset.summary.split('\n').map((l) => l.trimRight());

  let returnVal = `- ${firstLine}`;

  if (futureLines.length > 0) {
    returnVal += `\n${futureLines.map((l) => `  ${l}`).join('\n')}`;
  }
  return returnVal;
};

export const getDependencyReleaseLine = async (changesets, dependenciesUpdated) => {
  if (dependenciesUpdated.length === 0) return '';
  return `- Updated ${dependenciesUpdated[0].name} to v${dependenciesUpdated[0].newVersion}.`;
};
