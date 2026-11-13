# go-sdk

The `go` generator emits `src/api/client.go` — a full Go SDK over the standard library (zero dependencies, Go ≥ 1.21):

- structs with `json` tags
- typed-const enums
- a context-aware `Client` with `(T, error)` methods
- auth
- retries
- pagination iterators (`<Op>Pages` / `<Op>Items`)
- SSE streaming
- multipart bodies

```sh
npm run generate
go run .
```

The example calls the live demo API at `https://api.cafe.redocly.com` and prints three menu item names.
`MenuItem` is a discriminated union, so items arrive as `any`.
`UnmarshalMenuItem` dispatches them into `Beverage`/`Dessert` when you need the typed form.
