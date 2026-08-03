// Ejected from @redocly/client-generator@0.2.0 — the built-in "php" generator.
// This file is yours: edit freely; the generated client stays machine-owned and is
// rebuilt by `redocly generate-client`. Newer generator versions merge in with
// `redocly eject-generator php --update`.
// The built-in `php` generator — the third non-TypeScript library entry, authored
// with the language-neutral toolkit only (same dogfooding invariant as python/go,
// pinned by the guard test). Output is a single PHP >= 8.1 file over the curl
// extension: promoted-constructor classes with fromArray/toArray hydration, native
// backed enums, match-based discriminator dispatchers, and a Client over the
// embedded runtime. Exceptions are the error mode (`errorMode` does not apply).
import { CodeWriter, docText, discriminatorCases, enumValues, flattenAllOf, identifierFor, isNullable, paginationRuleFor, RESERVED_WORDS, schemaAtPointer, unwrapNullable, } from '@redocly/client-generator';
import { PHP_RUNTIME_SOURCE } from '@redocly/client-generator/runtime-sources';
const PHP = RESERVED_WORDS.php;
function className(name) {
    return identifierFor(name, { style: 'pascal', reserved: PHP });
}
function propertyName(name) {
    return identifierFor(name, { style: 'camel', reserved: PHP });
}
/** `'…'` with backslashes and quotes escaped — safe for any spec-supplied text. */
function phpString(value) {
    return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}
/** Follow ref chains through the named schemas (cycle-guarded). */
function deref(schema, model) {
    const seen = new Set();
    let current = schema;
    while (current.kind === 'ref') {
        const { name } = current;
        if (seen.has(name))
            return undefined;
        seen.add(name);
        const named = model.schemas.find((candidate) => candidate.name === name);
        if (named === undefined)
            return undefined;
        current = named.schema;
    }
    return current;
}
/** What a named schema renders as: a class, a native enum, or nothing (alias). */
function classify(name, model) {
    const named = model.schemas.find((candidate) => candidate.name === name);
    if (named === undefined)
        return 'other';
    const schema = named.schema;
    const asEnum = enumValues(schema);
    if (asEnum !== undefined && (asEnum.scalar === 'string' || asEnum.scalar === 'integer')) {
        return 'enum';
    }
    if ((schema.kind === 'object' || schema.kind === 'intersection') &&
        flattenAllOf(schema, model) !== undefined) {
        return 'class';
    }
    return 'other';
}
/** The PHP type declaration for a schema (arrays and unions widen to array/mixed). */
export function phpType(schema, model) {
    if (isNullable(schema)) {
        const inner = phpType(unwrapNullable(schema), model);
        return inner === 'mixed' || inner.startsWith('?') ? inner : `?${inner}`;
    }
    switch (schema.kind) {
        case 'scalar':
            return { string: 'string', integer: 'int', number: 'float', boolean: 'bool' }[schema.scalar];
        case 'array':
        case 'record':
            return 'array';
        case 'ref': {
            const kind = classify(schema.name, model);
            if (kind === 'class' || kind === 'enum')
                return className(schema.name);
            const target = deref(schema, model);
            return target === undefined ? 'mixed' : phpType(target, model);
        }
        case 'enum':
            // Anonymous (inline) enums keep the wire scalar; only NAMED enums get types.
            return { string: 'string', integer: 'int', number: 'float', boolean: 'bool' }[schema.scalar];
        case 'literal':
            return typeof schema.value === 'string'
                ? 'string'
                : typeof schema.value === 'boolean'
                    ? 'bool'
                    : 'float';
        case 'omit':
            // PHP has no Omit; the base class is the honest annotation.
            return className(schema.base);
        case 'union':
        case 'null':
        case 'object':
        case 'intersection':
        case 'unknown':
            return 'mixed';
    }
}
/** Wire value → typed value expression, or undefined when the raw value is already right. */
function hydration(schema, expr, model) {
    const bare = unwrapNullable(schema);
    if (bare.kind === 'omit')
        return hydration({ kind: 'ref', name: bare.base }, expr, model);
    if (bare.kind === 'ref') {
        const kind = classify(bare.name, model);
        if (kind === 'class')
            return `${className(bare.name)}::fromArray(${expr})`;
        if (kind === 'enum')
            return `${className(bare.name)}::from(${expr})`;
        const target = deref(bare, model);
        return target === undefined ? undefined : hydration(target, expr, model);
    }
    if (bare.kind === 'array') {
        const item = hydration(bare.items, '$item', model);
        if (item === undefined)
            return undefined;
        return `array_map(static fn ($item) => ${item}, ${expr})`;
    }
    if (bare.kind === 'record') {
        const item = hydration(bare.value, '$item', model);
        if (item === undefined)
            return undefined;
        return `array_map(static fn ($item) => ${item}, ${expr})`;
    }
    return undefined;
}
/** Typed value → wire value expression, or undefined when it serializes as-is. */
function serialization(schema, expr, model) {
    const bare = unwrapNullable(schema);
    if (bare.kind === 'omit')
        return serialization({ kind: 'ref', name: bare.base }, expr, model);
    if (bare.kind === 'ref') {
        const kind = classify(bare.name, model);
        if (kind === 'class')
            return `${expr}->toArray()`;
        if (kind === 'enum')
            return `${expr}->value`;
        const target = deref(bare, model);
        return target === undefined ? undefined : serialization(target, expr, model);
    }
    if (bare.kind === 'array' || bare.kind === 'record') {
        const inner = bare.kind === 'array' ? bare.items : bare.value;
        const item = serialization(inner, '$item', model);
        if (item === undefined)
            return undefined;
        return `array_map(static fn ($item) => ${item}, ${expr})`;
    }
    return undefined;
}
function writeDocComment(writer, name, description) {
    const lines = docText(description);
    if (lines.length === 0)
        return;
    writer.line(`/** ${name} — ${lines.join(' ')} */`);
}
function writeClass(writer, name, properties, model, description) {
    // PHP requires defaulted parameters after required ones.
    const ordered = [
        ...properties.filter((property) => property.required),
        ...properties.filter((property) => !property.required),
    ];
    writeDocComment(writer, className(name), description);
    writer.block(`final class ${className(name)}`, () => { }, '');
    writer.block('{', () => {
        writer.block('public function __construct(', () => {
            for (const property of ordered) {
                const type = phpType(property.schema, model);
                if (property.required) {
                    writer.line(`public ${type} ${'$'}${propertyName(property.name)},`);
                }
                else {
                    const nullable = type === 'mixed' || type.startsWith('?') ? type : `?${type}`;
                    writer.line(`public ${nullable} ${'$'}${propertyName(property.name)} = null,`);
                }
            }
        }, ') {');
        writer.line('}');
        writer.blank();
        writer.block('public static function fromArray(array $data): self', () => { }, '');
        writer.block('{', () => {
            writer.block('return new self(', () => {
                for (const property of ordered) {
                    const raw = `$data[${phpString(property.name)}]`;
                    const typed = hydration(property.schema, raw, model);
                    const php = propertyName(property.name);
                    if (property.required) {
                        writer.line(`${php}: ${typed ?? raw},`);
                    }
                    else if (typed === undefined) {
                        writer.line(`${php}: ${raw} ?? null,`);
                    }
                    else {
                        writer.line(`${php}: isset(${raw}) ? ${typed} : null,`);
                    }
                }
            }, ');');
        }, '}');
        writer.blank();
        writer.block('public function toArray(): array', () => { }, '');
        writer.block('{', () => {
            writer.line('$data = [];');
            for (const property of ordered) {
                const value = `$this->${propertyName(property.name)}`;
                const wire = serialization(property.schema, value, model) ?? value;
                if (property.required) {
                    writer.line(`$data[${phpString(property.name)}] = ${wire};`);
                }
                else {
                    writer.block(`if (${value} !== null) {`, () => {
                        writer.line(`$data[${phpString(property.name)}] = ${wire};`);
                    }, '}');
                }
            }
            writer.line('return $data;');
        }, '}');
    }, '}');
    writer.blank();
}
/** Render every named schema: classes (allOf flattened), native enums, union dispatchers. */
export function renderPhpModels(model) {
    const writer = new CodeWriter('    ');
    for (const { name, schema } of model.schemas) {
        const asEnum = enumValues(schema);
        if (asEnum !== undefined && (asEnum.scalar === 'string' || asEnum.scalar === 'integer')) {
            const backing = asEnum.scalar === 'string' ? 'string' : 'int';
            writeDocComment(writer, className(name), schema.description);
            writer.block(`enum ${className(name)}: ${backing}`, () => { }, '');
            writer.block('{', () => {
                asEnum.values.forEach((value) => {
                    const member = identifierFor(String(value), { style: 'pascal', reserved: PHP });
                    const literal = typeof value === 'string' ? phpString(value) : String(value);
                    writer.line(`case ${member} = ${literal};`);
                });
            }, '}');
            writer.blank();
            continue;
        }
        if (schema.kind === 'object' || schema.kind === 'intersection') {
            const flat = flattenAllOf(schema, model);
            if (flat !== undefined) {
                writeClass(writer, name, flat.properties, model, flat.description ?? schema.description);
                continue;
            }
        }
        const cases = discriminatorCases(schema, model);
        if (cases !== undefined) {
            const typeName = className(name);
            const table = cases.cases
                .map((entry) => `${entry.value} -> ${className(entry.schemaName)}`)
                .join(', ');
            writer.line(`/** ${typeName} is a discriminated union (${phpString(cases.property)}): ${table}. */`);
            writer.block(`function unmarshal${typeName}(array $data): mixed`, () => { }, '');
            writer.block('{', () => {
                writer.block(`return match ($data[${phpString(cases.property)}] ?? null) {`, () => {
                    for (const entry of cases.cases) {
                        writer.line(`${phpString(entry.value)} => ${className(entry.schemaName)}::fromArray($data),`);
                    }
                    writer.line('default => $data,');
                }, '};');
            }, '}');
            writer.blank();
            continue;
        }
        // Everything else (plain unions, aliases, records) has no PHP declaration;
        // references resolve to the underlying type via phpType.
    }
    return writer.toString();
}
/** The op's primary JSON success schema, or undefined for void/no-body ops. */
function successSchema(op) {
    return op.successResponses.find((response) => response.contentType.toLowerCase().includes('json'))
        ?.schema;
}
function sseResponse(op) {
    return op.successResponses.find((response) => response.contentType.toLowerCase().includes('text/event-stream'));
}
function isMultipart(op) {
    return op.requestBody?.contentType.toLowerCase().includes('multipart') ?? false;
}
function methodName(op) {
    return identifierFor(op.name, { style: 'camel', reserved: PHP });
}
const MUTATING = new Set(['post', 'put', 'patch']);
/** Security literal for the operations table, denormalized from the model's schemes. */
function phpSecurityLiteral(op, model) {
    if (op.security.length === 0)
        return undefined;
    const alternatives = op.security.map((andSet) => {
        const specs = andSet.flatMap((key) => {
            const scheme = model.securitySchemes.find((candidate) => candidate.key === key);
            if (scheme === undefined)
                return [];
            if (scheme.kind === 'bearer' || scheme.kind === 'basic') {
                return [`['kind' => ${phpString(scheme.kind)}, 'scheme' => ${phpString(scheme.key)}]`];
            }
            const where = scheme.kind === 'apiKeyQuery'
                ? 'query'
                : scheme.kind === 'apiKeyCookie'
                    ? 'cookie'
                    : 'header';
            const name = scheme.kind === 'apiKeyQuery'
                ? scheme.paramName
                : scheme.kind === 'apiKeyCookie'
                    ? scheme.cookieName
                    : scheme.headerName;
            return [
                `['kind' => 'apiKey', 'scheme' => ${phpString(scheme.key)}, 'name' => ${phpString(name)}, 'in' => ${phpString(where)}]`,
            ];
        });
        return `[${specs.join(', ')}]`;
    });
    return `[${alternatives.join(', ')}]`;
}
function phpPaginationLiteral(rule) {
    const fields = [
        `'style' => ${phpString(rule.style)}`,
        ...(rule.param !== undefined ? [`'param' => ${phpString(rule.param)}`] : []),
        ...(rule.nextCursor !== undefined ? [`'nextCursor' => ${phpString(rule.nextCursor)}`] : []),
        ...(rule.hasMore !== undefined ? [`'hasMore' => ${phpString(rule.hasMore)}`] : []),
        ...(rule.limitParam !== undefined ? [`'limitParam' => ${phpString(rule.limitParam)}`] : []),
        ...(rule.items !== undefined ? [`'items' => ${phpString(rule.items)}`] : []),
    ];
    return `[${fields.join(', ')}]`;
}
function methodArgs(op, model, includeBody) {
    const pathArgs = op.pathParams.map((param) => ({
        php: propertyName(param.name),
        wire: param.name,
        type: phpType(param.schema, model),
    }));
    const queryArgs = op.queryParams.map((param) => ({
        php: propertyName(param.name),
        wire: param.name,
        type: phpType(param.schema, model),
    }));
    const signature = [
        ...pathArgs.map(({ php, type }) => `${type} ${'$'}${php}`),
        ...(includeBody && op.requestBody
            ? [`${isMultipart(op) ? 'array' : phpType(op.requestBody.schema, model)} ${'$'}body`]
            : []),
        ...queryArgs.map(({ php, type }) => {
            const nullable = type === 'mixed' || type.startsWith('?') ? type : `?${type}`;
            return `${nullable} ${'$'}${php} = null`;
        }),
        '?array $headers = null',
        ...(includeBody && MUTATING.has(op.method.toLowerCase())
            ? ['?string $idempotencyKey = null']
            : []),
    ];
    return { pathArgs, queryArgs, signature };
}
/** The shared prologue: resolve auth, build query/url, merge headers. */
function writeRequestSetup(writer, op, args) {
    writer.line(`$op = OPERATIONS[${phpString(op.specName ?? op.name)}];`);
    writer.line("[$authHeaders, $query, $cookies] = resolveAuth($op['security'] ?? [], $this->config->auth);");
    for (const { php, wire } of args.queryArgs) {
        writer.block(`if (${'$'}${php} !== null) {`, () => {
            writer.line(`$query[${phpString(wire)}] = ${'$'}${php};`);
        }, '}');
    }
    const pathDict = args.pathArgs
        .map(({ php, wire }) => `${phpString(wire)} => ${'$'}${php}`)
        .join(', ');
    writer.line(`$url = buildUrl($this->config->serverUrl, $op['path'], [${pathDict}]);`);
    writer.line('$requestHeaders = array_merge($authHeaders, $headers ?? []);');
    writer.block('if ($cookies !== []) {', () => {
        writer.line("$requestHeaders['Cookie'] = implode('; ', $cookies);");
    }, '}');
}
function writePhpMethod(writer, op, model) {
    const args = methodArgs(op, model, true);
    const sse = sseResponse(op);
    const success = successSchema(op);
    const returnType = sse !== undefined ? '\\Generator' : success === undefined ? 'void' : phpType(success, model);
    writeDocComment(writer, methodName(op), op.summary ?? `${op.method.toUpperCase()} ${op.path}`);
    writer.block(`public function ${methodName(op)}(${args.signature.join(', ')}): ${returnType}`, () => { }, '');
    writer.block('{', () => {
        writeRequestSetup(writer, op, args);
        if (sse !== undefined) {
            const jsonData = sse.schema !== undefined && sse.schema.kind !== 'unknown';
            writer.line('$url = appendQuery($url, $query);');
            writer.block('$open = function (array $extraHeaders) use ($url, $requestHeaders): \\CurlHandle {', () => {
                writer.line('$handle = curl_init($url);');
                writer.line('$lines = [];');
                writer.block('foreach (array_merge($requestHeaders, $extraHeaders) as $name => $value) {', () => {
                    writer.line("$lines[] = $name . ': ' . $value;");
                }, '}');
                writer.line('curl_setopt($handle, CURLOPT_HTTPHEADER, $lines);');
                writer.line('return $handle;');
            }, '};');
            writer.line(`yield from iterSse($open, ${jsonData ? 'true' : 'false'});`);
            return;
        }
        const request = [
            `'operationId' => $op['id']`,
            `'method' => $op['method']`,
            `'url' => $url`,
            `'headers' => $requestHeaders`,
            `'query' => $query`,
        ];
        if (op.requestBody && isMultipart(op)) {
            writer.line('[$contentType, $encoded] = toMultipart($body);');
            request.push(`'body' => $encoded`, `'contentType' => $contentType`);
        }
        else if (op.requestBody) {
            const wire = serialization(op.requestBody.schema, '$body', model) ?? '$body';
            writer.line(`$payload = json_encode(${wire});`);
            request.push(`'body' => $payload`, `'contentType' => ${phpString(op.requestBody.contentType)}`);
        }
        if (MUTATING.has(op.method.toLowerCase()) && op.requestBody) {
            request.push(`'idempotencyKey' => $idempotencyKey`);
        }
        writer.line(`$response = send($this->config, [${request.join(', ')}]);`);
        writer.block("if ($response['status'] >= 400) {", () => {
            writer.line('throw apiErrorFrom($response);');
        }, '}');
        if (returnType === 'void') {
            writer.line('decodeJson($response);');
            return;
        }
        const typed = success === undefined ? undefined : hydration(success, 'decodeJson($response)', model);
        writer.line(`return ${typed ?? 'decodeJson($response)'};`);
    }, '}');
    writer.blank();
}
/** `<op>Pages()` / `<op>Items()` generators over the runtime's iterPages. */
function writePhpPaginationWrappers(writer, op, model, pageHydration, itemHydration, itemsPointer) {
    const args = methodArgs(op, model, false);
    const name = methodName(op);
    const writeCall = () => {
        writer.line(`$op = OPERATIONS[${phpString(op.specName ?? op.name)}];`);
        writer.line('$base = [];');
        for (const { php, wire } of args.queryArgs) {
            writer.block(`if (${'$'}${php} !== null) {`, () => {
                writer.line(`$base[${phpString(wire)}] = ${'$'}${php};`);
            }, '}');
        }
        const pathDict = args.pathArgs
            .map(({ php, wire }) => `${phpString(wire)} => ${'$'}${php}`)
            .join(', ');
        writer.block('$call = function (array $params) use ($op, $headers): array {', () => {
            writer.line("[$authHeaders, $authQuery, $cookies] = resolveAuth($op['security'] ?? [], $this->config->auth);");
            writer.line(`$url = buildUrl($this->config->serverUrl, $op['path'], [${pathDict}]);`);
            writer.line('$requestHeaders = array_merge($authHeaders, $headers ?? []);');
            writer.block('if ($cookies !== []) {', () => {
                writer.line("$requestHeaders['Cookie'] = implode('; ', $cookies);");
            }, '}');
            writer.line("$response = send($this->config, ['operationId' => $op['id'], 'method' => $op['method'], 'url' => $url, 'headers' => $requestHeaders, 'query' => array_merge($params, $authQuery)]);");
            writer.block("if ($response['status'] >= 400) {", () => {
                writer.line('throw apiErrorFrom($response);');
            }, '}');
            writer.line('return [decodeJson($response), $response];');
        }, '};');
    };
    writer.line(`/** ${name} response pages, following the pagination rule automatically. */`);
    writer.block(`public function ${name}Pages(${args.signature.join(', ')}): \\Generator`, () => { }, '');
    writer.block('{', () => {
        writeCall();
        writer.block("foreach (iterPages($call, $op['pagination'], $base) as $page) {", () => {
            writer.line(`yield ${pageHydration ?? '$page'};`);
        }, '}');
    }, '}');
    writer.blank();
    writer.line(`/** The items of every ${name} page. */`);
    writer.block(`public function ${name}Items(${args.signature.join(', ')}): \\Generator`, () => { }, '');
    writer.block('{', () => {
        writeCall();
        writer.block("foreach (iterPages($call, $op['pagination'], $base) as $page) {", () => {
            writer.line(`$items = resolvePointer($page, ${phpString(itemsPointer ?? '')});`);
            writer.block('foreach (is_array($items) ? $items : [] as $item) {', () => {
                writer.line(`yield ${itemHydration ?? '$item'};`);
            }, '}');
        }, '}');
    }, '}');
    writer.blank();
}
/** Drop the standalone header (<?php, declare, namespace, leading comments) for stitching. */
function stripPhpHeader(source) {
    const lines = source.split('\n');
    let start = 0;
    for (let index = 0; index < lines.length; index++) {
        const line = lines[index].trim();
        if (line.startsWith('namespace ')) {
            start = index + 1;
            break;
        }
    }
    return lines.slice(start).join('\n').trim();
}
/** The whole generated file: namespace + models + embedded runtime + operations + Client. */
export const phpGenerator = ({ model, outputPath, emit }) => {
    const writer = new CodeWriter('    ');
    const namespace = identifierFor(model.title, { style: 'pascal', reserved: PHP });
    writer.line('<?php');
    writer.blank();
    writer.line(`// Code generated by @redocly/client-generator (php) from ${phpString(model.title)} ${model.version}. DO NOT EDIT.`);
    writer.line('// Regenerate with `redocly generate-client`. PHP >= 8.1, curl extension — zero Composer dependencies.');
    // CUSTOMIZATION: our platform banner — regeneration keeps it, `--update` merges around it.
    writer.line('// Maintained by the Cafe platform team; see generators/php.mjs.');
    writer.blank();
    writer.line('declare(strict_types=1);');
    writer.blank();
    writer.line(`namespace ${namespace};`);
    writer.blank();
    writer.line(renderPhpModels(model));
    writer.line('// ─── Embedded runtime (@redocly/client-generator php runtime) ───');
    writer.line(stripPhpHeader(PHP_RUNTIME_SOURCE));
    writer.blank();
    const operations = model.services.flatMap((service) => service.operations);
    const paginationRules = new Map();
    for (const op of operations) {
        const rule = paginationRuleFor(op, emit.pagination);
        if (rule !== undefined)
            paginationRules.set(op.name, rule);
    }
    writer.block('const OPERATIONS = [', () => {
        for (const op of operations) {
            const id = op.specName ?? op.name;
            const security = phpSecurityLiteral(op, model);
            const rule = paginationRules.get(op.name);
            const fields = [
                `'id' => ${phpString(id)}`,
                `'method' => ${phpString(op.method.toUpperCase())}`,
                `'path' => ${phpString(op.path)}`,
                ...(security !== undefined ? [`'security' => ${security}`] : []),
                ...(rule !== undefined ? [`'pagination' => ${phpPaginationLiteral(rule)}`] : []),
            ];
            writer.line(`${phpString(id)} => [${fields.join(', ')}],`);
        }
    }, '];');
    writer.blank();
    writeDocComment(writer, 'Client', `Client for ${model.title} (${model.version}).`);
    writer.block('final class Client', () => { }, '');
    writer.block('{', () => {
        writer.block('public function __construct(private Config $config)', () => { }, '');
        writer.block('{', () => {
            writer.block("if ($this->config->serverUrl === '') {", () => {
                writer.line(`$this->config->serverUrl = ${phpString(model.serverUrl ?? '')};`);
            }, '}');
        }, '}');
        writer.blank();
        for (const op of operations) {
            writePhpMethod(writer, op, model);
            const rule = paginationRules.get(op.name);
            if (rule === undefined)
                continue;
            const success = successSchema(op);
            const pageHydration = success === undefined ? undefined : hydration(success, '$page', model);
            // Resolve the items ARRAY, then take its raw element, so a `ref` element
            // keeps its class name (a deref'd result would hydrate as plain data).
            const itemsArray = success !== undefined && rule.items !== undefined
                ? schemaAtPointer(success, rule.items, model)
                : undefined;
            const element = itemsArray?.kind === 'array' ? itemsArray.items : undefined;
            const itemHydration = element === undefined ? undefined : hydration(element, '$item', model);
            writePhpPaginationWrappers(writer, op, model, pageHydration, itemHydration, rule.items);
        }
    }, '}');
    return [{ path: outputPath.replace(/\.[^.\\/]+$/, '.php'), content: writer.toString() }];
};
/** One idiomatic PHP call per operation — feeds `x-codeSamples` for docs. */
export function phpSample(op, ctx) {
    const args = [
        ...op.pathParams.map((param) => `${phpString(`<${propertyName(param.name)}>`)}`),
        ...(op.requestBody ? ['$body'] : []),
        ...(op.queryParams.length > 0
            ? [`${propertyName(op.queryParams[0].name)}: ${phpString('<value>')}`]
            : []),
    ];
    const namespace = identifierFor(ctx.model.title, { style: 'pascal', reserved: PHP });
    return {
        lang: 'php',
        label: 'PHP SDK',
        source: `use ${namespace}\\{Client, Config};\n\n$client = new Client(new Config());\n$result = $client->${methodName(op)}(${args.join(', ')});\n`,
    };
}

export default {
  name: 'php',
  run: phpGenerator,
  sample: phpSample,
};
