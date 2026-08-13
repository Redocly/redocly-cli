# python-sdk

The `python` generator emits `src/api/client.py`.
'It is a full Python SDK over [httpx](https://www.python-httpx.org/) (Python ≥ 3.9):

- typed dataclass models
- sync `Client`
- async `AsyncClient`
- auth
- retries
- pagination iterators (`<op>_pages()` / `<op>_items()`)
- SSE streaming
- multipart bodies 

No TypeScript is involved — a `python`-only selection never loads the `typescript` package.

```sh
npm run generate
pip install httpx
python src/main.py
```

The example calls the live demo API at `https://api.cafe.redocly.com` and prints three menu item names.
