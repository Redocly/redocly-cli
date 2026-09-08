# ADR 0021: Text printers — one common printer plus one per language

- Status: Accepted
- Date: 2026-08-21
- Supersedes: [ADR-0001](./0001-ast-codegen.md)

## Context

[ADR-0001](./0001-ast-codegen.md) chose `ts.factory` AST codegen and is still marked Accepted, but the code has not worked that way for some time: `emitters/ts.ts` and `emitters/package-client.ts` no longer exist, and every built-in generator emits text.
That migration happened because the generator gained non-TypeScript output languages, and an AST for TypeScript does nothing for Python, Go, or PHP.
This ADR records the shape the code actually has, and settles what belongs in a shared printer.

The text layer today is inconsistent in ways that are more than cosmetic — the full inventory is in [`../helper-surface.md`](../helper-surface.md), and the load-bearing findings are:

- **Two identifier systems.** `authoring/naming.ts` states it in its own header: _"TypeScript keeps its specialized sanitizer in emitters/identifier.ts; this is for the other output languages."_ The TypeScript reserved-word list exists twice, and the two systems disagree on convention — `sanitizeIdentifier` prefixes (`_class`), `identifierFor` suffixes (`class_`).
- **Two TypeScript string escapers with different security policies.** `codeString` escapes U+2028/U+2029; `sanitizeCodeString` also escapes `<`/`>` to prevent a `</script>` breakout. Which protection applies depends on which one the caller imported.
- **Python and Go have no string escaper at all** — 19 and 28 raw `JSON.stringify` calls respectively, relying on JSON escaping being close enough to each language's literal syntax.
- **Four hand-rolled doc-comment writers**, each re-deriving real per-language rules: Go collapses consecutive blank comment lines because gofmt rewrites `//\n//`; TypeScript must escape `*/` because `info.title` is attacker-controllable; Python has distinct one-line and multi-line docstring forms; PHP needs `@tag` lines because its type syntax erases element types.
- **Indent units are passed at call sites** — `new Printer('    ')`, `new Printer('\t')`.

Two alternatives were considered and rejected.

**Prettier's Doc IR** (the Wadler/Oppen algebra behind `group`/`line`/`indent`) would buy automatic line-width breaking, which is a genuine gap — generated output is hand-formatted with no post-pass.
It was rejected because `group([indent([line, …])])` hides the emitted text, and Prettier's own architecture argues against it here: Prettier has no universal syntax model either, only a universal _layout_ engine plus a hand-written printer per language.
Its printers run to thousands of lines because they must handle every possible program; ours emit roughly fifteen constructs per language.
We do not have Prettier's problem.

**Tree-sitter** is a parser with no unparser, and there is no universal AST or codegen spec to adopt (UAST is dead; srcML covers a few C-family languages).

**Delegating to real formatters** (prettier, black, gofmt, php-cs-fixer) was rejected because those tools are not available in a Node CLI, so formatting would depend on what is on `PATH` — breaking the determinism rule that the same description produces the same bytes.

## Decision

**Generated code is text, built by a common structural printer plus one syntax printer per output language.**

1. **The common `Printer` owns structure only** — `line`, `blank`, `lines`, `indent`, `block`, `toString` — and stays in the neutral toolkit.
2. **A language printer extends it with syntax**, one per output language, with a common core: `typeName`, `memberName`, `identifier`, `identifiers`, `string`, `literal`, `comment`, `doc`, a baked-in `indentUnit`, and a `layout(source)` pass that `toString()` applies.
   `identifier` is spelled out rather than abbreviated; `ident` is too easily misread as `indent` at the call sites where both appear.
3. **The boundary is syntax versus shape.** The printer owns identifier safety, string escaping, literal rendering, comment and doc syntax, indentation, and whole-file layout.
   The generator owns everything that decides output shape — classes, functions, signatures, field lists — written as template literals.
   The test for whether a method belongs on the printer: **is there exactly one right answer?**
   `py.string("it's")` has one. `py.dataclass(name, fields)` has a hundred (frozen? slots? kw_only?), which makes it a design decision, and design decisions must stay visible in the generator.
4. **The boundary is enforced, not agreed.** A guard test asserts each generator's source still contains the literal keywords it emits, so an agent asked to make dataclasses frozen finds `@dataclass` on a line and edits it, rather than needing to read a printer that is not in the ejected folder.
5. **Per-language extensions are kept, not flattened.** Only TypeScript has quotable object keys (`key`); only PHP needs doc `tags`; only Go needs `layout` and an exported-ness rule; only Python needs `memberName` to report that it renamed, for `_field_map`.
   Forcing a lowest common denominator would lose real language knowledge — notably Go's `_`→`N` rule, where `identifierFor`'s `_` prefix for a digit-leading name means **unexported**, so `encoding/json` would silently skip the field.
6. **The duplicates collapse.** One TypeScript reserved-word list, one TypeScript string escaper (on the stricter policy), one doc-comment path per language.

`layout()` exists because Go demands byte-exact `gofmt` output: CI commonly runs `gofmt -l` and fails on any file it would reformat, and column alignment cannot be computed line-by-line — the padding for the first field depends on the longest field in a run that has not been emitted yet.
It is the identity function for TypeScript, Python, and PHP.

## Consequences

- Four printers fill the same six slots, which is the check that the abstraction is real rather than a bag of leftovers.
- The security-relevant escaping (`*/` in JSDoc, `<`/`>` in code strings, quoting in every language) is applied by construction instead of being a rule each generator author must have read.
- Python and Go gain a defined string-escaping policy where they had none.
- Ejected generators still read as the language they emit: `class`, `@dataclass`, `ClassVar[Dict[str, str]]` remain literal text in the file the user owns.
- **Three behavior changes move output bytes** — a real `string()` for Python and Go (47 call sites), the stricter merged TypeScript escaper, and unifying the two pagination resolvers.
  All three are in scope for this rewrite rather than deferred, since the package is experimental ([ADR-0013](./0013-experimental-status.md)) and each fixes a defect rather than merely relocating code.
  Each lands with its own tests and snapshot updates, so a byte change is reviewed as a behavior change and not lost inside a large move.
- **Cost: no automatic line-width breaking.** Long union types, signatures, and argument lists stay hand-wrapped. If that becomes a real complaint, the surgical fix is a `wrap()` helper for the few constructs that run long, not a change in how code is represented.
- ADR-0001's warning survives its decision and still applies: the printer is not a sanitizer. Names are coerced in the IR (`intermediate-representation/sanitize-identifiers.ts`) and comment text is escaped by `doc()`. Any new value flowing into an identifier slot or a comment needs the same handling.
