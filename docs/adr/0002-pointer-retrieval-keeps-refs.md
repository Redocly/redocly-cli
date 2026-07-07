# Pointer retrieval keeps `$ref`s intact

`redocly map --pointer=<json-pointer>` closes the retrieval half of the map's index-navigate-retrieve loop:
it prints the logical content at any canonical pointer, resolving the addressed node itself
(a path item that is a file `$ref` prints the target file's content)
but leaving `$ref`s inside the printed content untouched.

We chose not to inline the subtree:
inlining duplicates shared schemas across fetches, needs cycle guards for recursive schemas,
and can silently explode output size.
Keeping refs is honest and cycle-proof — the consumer follows them with further `--pointer` calls,
guided by the map.

Source locations additionally carry `startLine`/`endLine`
(computed from the same YAML AST positions the lint codeframes use),
so consumers with plain file tools can retrieve node content without any JSON-pointer tooling.
