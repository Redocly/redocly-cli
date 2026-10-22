---
'@redocly/cli': minor
---

The `preview` command now runs `@redocly/framework` and accepts the `pro`, `scale` and `enterprise` plans with the `--plan` option. A project whose `package.json` lists `@redocly/realm`, `@redocly/redoc`, `@redocly/revel`, `@redocly/reef` or one of their blends still previews with that package. The `--product` option is deprecated.
