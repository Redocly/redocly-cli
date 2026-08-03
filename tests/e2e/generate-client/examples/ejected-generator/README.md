# ejected-generator

The shadcn story for generators: `redocly eject-generator php` vendored the built-in PHP generator into `generators/php.mjs`, and this repo customized it — search the file for `CUSTOMIZATION` to see the one-line change (a platform banner in the generated header).
The _generated_ client stays machine-owned: regenerate any time and the customization is still there, because the customization lives in the generator, not in its output.

```sh
npm run generate
head src/api/client.php   # the customized banner is in the generated header
```

`generators/AGENTS.md` (committed here, exactly as the command drops it) is the authoring guide your coding agent reads before editing the generator — point your agent at it and describe the change you want.
In your own repo, ejecting also writes `generators/.pristine/php.mjs`; commit it — it is the merge base for updates.
When a newer generator version ships, `redocly eject-generator php --update` three-way-merges it into your customized copy (pristine × new × yours); clean hunks apply silently, real conflicts get standard markers.
The ejected file imports the authoring toolkit and the embedded runtime from `@redocly/client-generator`, so runtime fixes still arrive with plain `npm update` — no merge needed.
