# ejected-generator

The shadcn story for generators: `redocly eject-generator php` vendored the built-in PHP generator into `generators/php.mjs`, and this repo customized it — search the file for `CUSTOMIZATION` to see the one-line change (a platform banner in the generated header).
The _generated_ client stays machine-owned: regenerate any time and the customization is still there, because the customization lives in the generator, not in its output.

```sh
npm run generate
head src/api/client.php     # the customized banner is in the generated header
npm run update-generator    # merge a newer generator version into the customized copy
```

`generators/AGENTS.md` (committed here, exactly as the command drops it) is the authoring guide your coding agent reads before editing the generator — point your agent at it and describe the change you want.
`generators/.pristine/php.mjs` (committed, as it should be in your repo too) is the merge base: `npm run update-generator` three-way-merges a newer generator version into the customized copy — clean hunks apply silently, real conflicts get standard markers.
This example started from `redocly eject-generator php`; run that in your own repo to begin.
The ejected file imports the authoring toolkit and the embedded runtime from `@redocly/client-generator`, so runtime fixes still arrive with plain `npm update` — no merge needed.
