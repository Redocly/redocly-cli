# java-sdk

The `java` generator emits `src/api/Client.java` — a full Java SDK over `java.net.http` (zero dependencies, Java ≥ 17):

- records with `fromJson`/`toJson`
- wire-backed enums
- sealed interfaces for discriminated unions
- a `Client` with one method per operation
- auth
- retries
- pagination iterables (`<op>Pages()` / `<op>Items()`)
- SSE streaming
- multipart bodies

The package derives from the API title (`redoclycafe` here).

```sh
npm run generate
javac -d out src/api/Client.java Main.java
java -cp out Main
```

The example calls the live demo API at `https://api.cafe.redocly.com` and prints three menu item names.
`MenuItem` is a sealed interface, so `instanceof` patterns narrow each item to `Beverage` or `Dessert`.
