// The `pagination` stage: the `<op>Pages()` / `<op>Items()` iterables over the
// runtime's iterPages.

import {
  type ApiModel,
  type DateType,
  jsonSuccessSchema,
  type NeutralPaginationRule,
  type OperationModel,
  paginationItemSchema,
} from '@redocly/client-generator';
import type { JavaPrinter } from '@redocly/client-generator/printers/java';

import { javaOperationLiteral } from './descriptor.ts';
import { hydration } from './models.ts';
import { methodArgs, urlExpression, writeQueryParams } from './operations.ts';
import { javaType } from './types.ts';

/** `<op>Pages()` / `<op>Items()` iterables over the runtime's iterPages, hydrated per element. */
export function writeJavaPaginationWrappers(
  printer: JavaPrinter,
  op: OperationModel,
  ident: string,
  model: ApiModel,
  dateType: DateType,
  rule: NeutralPaginationRule
): void {
  const args = methodArgs(op, ident, model, false, dateType);
  const success = jsonSuccessSchema(op);
  const pageType = success === undefined ? 'Object' : javaType(success, model, dateType);
  const element = paginationItemSchema(success, rule.items, model);
  const itemType = element === undefined ? 'Object' : javaType(element, model, dateType);
  const pageHydration =
    success === undefined ? 'page' : (hydration(success, 'page', model, dateType) ?? 'page');
  const itemHydration =
    element === undefined ? 'item' : (hydration(element, 'item', model, dateType, 1) ?? 'item');

  const writeCall = () => {
    printer.line(`Operation op = ${javaOperationLiteral(op, model, rule)};`);
    printer.line('Map<String, List<String>> base = new LinkedHashMap<>();');
    writeQueryParams(printer, args, 'base');
    printer.block(
      'PageCall call = pageParams -> {',
      () => {
        printer.line('ResolvedAuth auth = resolveAuth(op.security(), config.auth);');
        printer.line('Map<String, List<String>> query = cloneQuery(auth.query());');
        printer.line('query.putAll(pageParams);');
        printer.line(`String url = ${urlExpression(args)};`);
        printer.line(
          'HttpResponse<InputStream> response = send(config, new RequestSpec(op.id(), op.method(), url).headers(auth.headers()).query(query));'
        );
        printer.block(
          'if (response.statusCode() >= 400) {',
          () => {
            printer.line('throw apiErrorFrom(response, url);');
          },
          '}'
        );
        printer.line('return new PageResult(decodeJson(response), response);');
      },
      '};'
    );
  };

  printer.line(`/** ${ident} response pages, following the pagination rule automatically. */`);
  printer.block(
    `public Iterable<${pageType}> ${ident}Pages(${args.signature.join(', ')}) {`,
    () => {
      writeCall();
      printer.line(
        `return mapIterable(iterPages(call, op.pagination(), base), page -> ${pageHydration});`
      );
    },
    '}'
  );
  printer.blank();

  printer.line(`/** The items of every ${ident} page. */`);
  printer.block(
    `public Iterable<${itemType}> ${ident}Items(${args.signature.join(', ')}) {`,
    () => {
      writeCall();
      printer.line(
        `return mapIterable(flattenItems(iterPages(call, op.pagination(), base), op.pagination().items()), item -> ${itemHydration});`
      );
    },
    '}'
  );
  printer.blank();
}
