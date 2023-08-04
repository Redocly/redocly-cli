const getReleaseLine = async (
  changeset /* : NewChangesetWithCommit */,
  _type /* : VersionType */
) => {
  const [firstLine, ...futureLines] = changeset.summary.split('\n').map((l) => l.trimRight());

  let returnVal = `- ${changeset.commit ? `${changeset.commit}: ` : ''}${firstLine}`;

  if (futureLines.length > 0) {
    returnVal += `\n${futureLines.map((l) => `  ${l}`).join('\n')}`;
  }
  return returnVal;
};

const getDependencyReleaseLine = async (
  changesets /* : NewChangesetWithCommit[] */,
  dependenciesUpdated /* : ModCompWithPackage[] */
) => {
  if (dependenciesUpdated.length === 0) return '';
  return `- Updated ${dependenciesUpdated[0].name} to v${dependenciesUpdated[0].newVersion}.`;
};

const defaultChangelogFunctions /* : ChangelogFunctions */ = {
  getReleaseLine,
  getDependencyReleaseLine,
};

module.exports = defaultChangelogFunctions;
