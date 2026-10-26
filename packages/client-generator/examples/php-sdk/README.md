# php-sdk

The `php` generator emits `src/api/client.php` — a full PHP SDK over the curl extension (zero Composer dependencies, PHP ≥ 8.1):

- promoted-constructor classes with `fromArray`/`toArray` hydration
- native backed enums
- a `Client` with typed named-argument methods
- auth
- retries
- pagination generators (`<op>Pages()` / `<op>Items()`)
- SSE streaming
- multipart bodies

The namespace derives from the API title (`RedoclyCafe` here).

```sh
npm run generate
php src/main.php
```

The example calls the live demo API at `https://api.cafe.redocly.com` and prints three menu item names.
