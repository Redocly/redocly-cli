# Code quality standards

Write the simplest code that solves the problem and reads like the file around it. The
rules below are the specific practices this repository enforces — most are also what
`/deslop` strips out.

1. **No needless wrappers or abstractions.** Don't wrap a function that's used in one
   place, and don't add layers for a single caller. Plain, readable code beats a clever
   indirection.

2. **No overcomplicated code.** Keep it simple, understandable, and explainable, and make
   it fit the existing architecture.

3. **Descriptive names.** Use names like `pkgRootMatch`, `inputPath`, `error` — never
   single letters or abbreviations like `m`, `p`, `e`. This applies across every package
   and script.

4. **Comments match the file.** Don't add comments that restate the code or exceed the
   surrounding file's comment density. Plain English only.

5. **No defensive noise in trusted paths.** Skip `try/catch` and null checks in code the
   walker has already validated — add them only where input is genuinely untrusted.

6. **No `any` to silence the type checker.** Fix the type instead; the shared type
   definitions live in `packages/core/src/types/`.

7. **Never write to stdout/stderr directly.** No `console.log` — use the `logger` from
   `@redocly/openapi-core` (`packages/core/src/logger.ts`). Direct writes break the e2e
   snapshots.

8. **Use ESM `.js` import extensions.** Imports point at the compiled path, e.g.
   `import type { Oas3Rule } from '../../visitors.js'`.

9. **Prefer real rule code over assertion-based rules,** and reuse an existing rule name
   when the same concept already exists for another spec flavor.

10. **The repo lints with oxlint and formats with oxfmt** (not ESLint/Prettier). Run
    `npm run lint` and `npm run format` before committing.
