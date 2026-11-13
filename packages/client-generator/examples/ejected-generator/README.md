# ejected-generator

The vendoring story for generators: `redocly eject-generator php` copied the built-in PHP generator into `generators/php/` — TypeScript source, one file per stage — and this repo customized it.
Search `generators/php/index.ts` for `CUSTOMIZATION` to see the one-line change (a platform banner in the generated header).
Running a TypeScript generator uses Node's type stripping (Node 22.18 or 23.6 and newer).
The generated client stays machine-owned: regenerate any time while preserving customization.
The customization lives in the generator, not in its output.

```sh
npm run generate
head src/api/client.php     # the customized banner is in the generated header
npm run update-generator    # merge a newer generator version into the customized copy
```

`.claude/skills/php-generator/SKILL.md` is the generator's design and `.claude/skills/client-generators/SKILL.md` is the authoring toolkit — both committed here exactly as the command drops them.
Your coding agent loads them on its own: describe the change you want, and it edits the design first, then the generator.
`generators/AGENTS.md` is the short pointer the command leaves beside the code.
`npm run update-generator` three-way-merges a newer generator version into this customized copy, file by file — clean hunks apply silently, real conflicts get standard `<<<<<<<` markers.
The merge base is the version recorded in each file's own header, so there is nothing extra to commit or keep in sync.
This example started from `redocly eject-generator php`.
Run this command in your own repo to begin.
The ejected generator imports the authoring toolkit and the embedded runtime from `@redocly/client-generator`, so runtime fixes still arrive with plain `npm update` — no merge needed.
