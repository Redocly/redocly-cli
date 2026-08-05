# ejected-generator

The shadcn story for generators: `redocly eject-generator php` vendored the built-in PHP generator into `generators/php.mjs`, and this repo customized it — search the file for `CUSTOMIZATION` to see the one-line change (a platform banner in the generated header).
The _generated_ client stays machine-owned: regenerate any time and the customization is still there, because the customization lives in the generator, not in its output.

```sh
npm run generate
head src/api/client.php     # the customized banner is in the generated header
npm run update-generator    # merge a newer generator version into the customized copy
```

`.claude/skills/php-generator/SKILL.md` is the generator's design and `.claude/skills/client-generators/SKILL.md` is the authoring toolkit — both committed here exactly as the command drops them.
Your coding agent loads them on its own: describe the change you want, and it edits the design first, then the generator.
`generators/AGENTS.md` is the short pointer the command leaves beside the code.
`generators/.pristine/php.mjs` (committed, as it should be in your repo too) is the merge base: `npm run update-generator` three-way-merges a newer generator version into the customized copy — clean hunks apply silently, real conflicts get standard markers.
This example started from `redocly eject-generator php`; run that in your own repo to begin.
The ejected file imports the authoring toolkit and the embedded runtime from `@redocly/client-generator`, so runtime fixes still arrive with plain `npm update` — no merge needed.
