// Ejected from @redocly/client-generator@0.3.8 — the built-in "php" generator.
// This file is yours: edit freely; the generated client stays machine-owned and is
// rebuilt by `redocly generate-client`. Newer generator versions merge in with
// `redocly eject-generator php --update`.
// The `pagination` stage: the `<op>Pages()` / `<op>Items()` generator methods
// over the runtime's iterPages.

import {
  type ApiModel,
  type DateType,
  jsonSuccessSchema,
  type OperationModel,
} from '@redocly/client-generator';
import type { PhpPrinter } from '@redocly/client-generator/printers/php';

import { phpString } from './naming.ts';
import { methodArgs } from './operations.ts';
import { phpType } from './types.ts';

/** `<op>Pages()` / `<op>Items()` generators over the runtime's iterPages. */
export function writePhpPaginationWrappers(
  printer: PhpPrinter,
  op: OperationModel,
  ident: string,
  model: ApiModel,
  dateType: DateType,
  pageHydration: string | undefined,
  itemHydration: string | undefined,
  itemsPointer: string | undefined,
  itemYield: string
): void {
  const args = methodArgs(op, model, false, dateType);
  const name = ident;

  const writeCall = () => {
    printer.line(`$op = OPERATIONS[${phpString(op.specName ?? op.name)}];`);
    printer.line('$base = [];');
    for (const { php, wire, value } of args.queryArgs) {
      printer.block(
        `if (${'$'}${php} !== null) {`,
        () => {
          printer.line(`$base[${phpString(wire)}] = ${value};`);
        },
        '}'
      );
    }
    const pathDict = args.pathArgs
      .map(({ php, wire }) => `${phpString(wire)} => ${'$'}${php}`)
      .join(', ');
    printer.block(
      '$call = function (array $params) use ($op, $headers): array {',
      () => {
        printer.line(
          "[$authHeaders, $authQuery, $cookies] = resolveAuth($op['security'] ?? [], $this->config->auth);"
        );
        printer.line(`$url = buildUrl($this->config->serverUrl, $op['path'], [${pathDict}]);`);
        printer.line('$requestHeaders = array_merge($authHeaders, $headers ?? []);');
        printer.block(
          'if ($cookies !== []) {',
          () => {
            printer.line("$requestHeaders['Cookie'] = implode('; ', $cookies);");
          },
          '}'
        );
        printer.line(
          "$response = send($this->config, ['operationId' => $op['id'], 'method' => $op['method'], 'url' => $url, 'headers' => $requestHeaders, 'query' => array_merge($params, $authQuery)]);"
        );
        printer.block(
          "if ($response['status'] >= 400) {",
          () => {
            printer.line('throw apiErrorFrom($response);');
          },
          '}'
        );
        printer.line('return [decodeJson($response), $response];');
      },
      '};'
    );
  };

  const pageType = phpType(jsonSuccessSchema(op) ?? { kind: 'unknown' }, model, dateType);
  const pageYield = pageType === 'mixed' ? 'mixed' : pageType;
  printer.line('/**');
  printer.line(` * ${name} response pages, following the pagination rule automatically.`);
  printer.line(' *');
  printer.line(` * @return \\Generator<int, ${pageYield}>`);
  printer.line(' */');
  printer.line(`public function ${name}Pages(${args.signature.join(', ')}): \\Generator`);
  printer.block(
    '{',
    () => {
      writeCall();
      printer.block(
        "foreach (iterPages($call, $op['pagination'], $base) as $page) {",
        () => {
          printer.line(`yield ${pageHydration ?? '$page'};`);
        },
        '}'
      );
    },
    '}'
  );
  printer.blank();

  printer.line('/**');
  printer.line(` * The items of every ${name} page.`);
  printer.line(' *');
  printer.line(` * @return \\Generator<int, ${itemYield}>`);
  printer.line(' */');
  printer.line(`public function ${name}Items(${args.signature.join(', ')}): \\Generator`);
  printer.block(
    '{',
    () => {
      writeCall();
      printer.block(
        "foreach (iterPages($call, $op['pagination'], $base) as $page) {",
        () => {
          printer.line(`$items = resolvePointer($page, ${phpString(itemsPointer ?? '')});`);
          printer.block(
            'foreach (is_array($items) ? $items : [] as $item) {',
            () => {
              printer.line(`yield ${itemHydration ?? '$item'};`);
            },
            '}'
          );
        },
        '}'
      );
    },
    '}'
  );
  printer.blank();
}
