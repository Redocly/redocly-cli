// The prepare-time transform from a generator's in-repo skill to the SKILL.md eject drops
// into the user's `.claude/skills/`. The source skill speaks to development inside this repo — its intro and modify
// loop reference index.ts, the prepare script, and our vitest suites, none of which
// exist in a user's repo. The ejected copy keeps the design sections verbatim but
// rewrites those two parts for the user's world: their copy is the generator's source
// folder at generators/<name>/, and their loop is edit → regenerate → diff. The design bullets in between ship
// unchanged, and both anchors are structural (the first `## ` heading and the final
// `## The modify loop` section), so skills can grow without touching this transform.
export function ejectedSkill(source, name) {
  const copy = `generators/${name}/`;
  const frontmatter = [
    '---',
    `name: ${name}-generator`,
    `description: Design of the ejected Redocly \`${name}\` client generator. Read it, and update it, before changing ${copy}.`,
    '---',
    '',
  ].join('\n');
  const titleEnd = source.indexOf('\n\n');
  const firstHeading = source.indexOf('\n## ');
  const loopHeading = source.indexOf('\n## The modify loop');
  if (titleEnd === -1 || firstHeading === -1 || loopHeading === -1) {
    throw new Error(`The ${name} skill lost its title/intro/modify-loop structure.`);
  }
  const intro = [
    `This file is the DESIGN of your ejected \`${name}\` generator (\`${copy}\`):`,
    '**to change the generator, edit this skill first, then make the code match it** — a diff',
    `to \`${copy}\` that has no covering sentence here is incomplete.`,
  ].join('\n');
  const modifyLoop = [
    '## The modify loop',
    '',
    '1. Edit this skill: state the new behavior or decision.',
    `2. Make \`${copy}\` match it.`,
    '3. Run `redocly generate-client` and inspect the `git diff` of the generated output —',
    '   generated files are never hand-edited.',
    '',
    `Newer built-in versions merge in with \`redocly eject-generator ${name} --update\`.`,
    '',
  ].join('\n');
  const designSections = source.slice(firstHeading, loopHeading);
  return `${frontmatter}\n${source.slice(0, titleEnd)}\n\n${intro}\n${designSections}\n${modifyLoop}`;
}
