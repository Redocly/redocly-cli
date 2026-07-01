import fs from 'node:fs';
import outdent from 'outdent';

const json = JSON.parse(fs.readFileSync('./output/changesets.json', 'utf-8'));

const versions = {};
for (const { name, newVersion } of json.releases) {
  // Exclude @redocly/cli for it's the target package.
  if (name !== '@redocly/cli') {
    versions[name] = newVersion;
  }
}

const changedInternalPackagesSet = new Set();
for (const changeset of json.changesets) {
  for (const { name } of changeset.releases) {
    if (versions[name]) {
      changedInternalPackagesSet.add(name);
    }
  }
}

for (const internalPackage of changedInternalPackagesSet) {
  const changeset = outdent`
    ---
    '@redocly/cli': patch
    ---

    Updated ${internalPackage} to v${versions[internalPackage]}.
  `;
  const filePath = `.changeset/update-${internalPackage.replace('@redocly/', '')}.md`;
  fs.writeFileSync(filePath, changeset);
}
