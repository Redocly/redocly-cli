# pagination example

Auto-pagination from a `redocly.yaml` convention: the `client.pagination` block declares
one cursor rule, the generator applies it to every operation it structurally fits, and
the paginated operation gains `.pages()` / `.items()` async iterators next to its
unchanged one-shot call. Item types are computed statically from the response schema.

## Run

```bash
npm install        # dev tooling only (the CLI + tsx); the client itself needs nothing
npm run generate   # generate src/api (the client is gitignored)
npm start          # iterates two canned pages of orders and prints them
```

The generated client under `src/api/` is gitignored; CI regenerates it and type-checks this example.
