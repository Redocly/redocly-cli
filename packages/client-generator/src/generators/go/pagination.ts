// The `pagination` stage: the `<Op>Pages` / `<Op>Items` yield-func iterators.

import { type DateType, type OperationModel } from '@redocly/client-generator';
import { exported, type GoPrinter } from '@redocly/client-generator/printers/go';

import { naming } from './naming.ts';
import { goQueryFormat, pathArguments } from './operations.ts';
import { goType } from './types.ts';

/** `<Op>Pages` / `<Op>Items` iterators over the runtime's `iterPages`, hydrated via `reencode`. */
export function writeGoPaginationWrappers(
  printer: GoPrinter,
  op: OperationModel,
  ident: string,
  dateType: DateType,
  pageType: string,
  itemType: string
): void {
  const pathArgs = pathArguments(op, dateType);
  const hasParams = op.queryParams.length > 0;
  const args = [
    'ctx context.Context',
    ...pathArgs.map(({ go, type }) => `${go} ${type}`),
    ...(hasParams ? [`params *${ident}Params`] : []),
  ].join(', ');

  const writeCallClosure = () => {
    printer.line(`op := operations[${naming.string(op.specName ?? op.name)}]`);
    printer.line('base := url.Values{}');
    if (hasParams) {
      printer.block(
        'if params != nil {',
        () => {
          for (const param of op.queryParams) {
            const field = exported(param.name);
            printer.block(
              `if params.${field} != nil {`,
              () => {
                printer.line(
                  `base.Set(${naming.string(param.name)}, ${goQueryFormat(`*params.${field}`, goType(param.schema, dateType))})`
                );
              },
              '}'
            );
          }
        },
        '}'
      );
    }
    printer.block(
      'call := func(pageParams url.Values) (any, *http.Response, error) {',
      () => {
        printer.line('authHeaders, query := resolveAuth(op.Security, c.config.Auth)');
        printer.block(
          'for key, values := range pageParams {',
          () => {
            printer.block(
              'for _, value := range values {',
              () => {
                printer.line('query.Set(key, value)');
              },
              '}'
            );
          },
          '}'
        );
        const pathDict = pathArgs
          .map(({ param, go, type }) => `${naming.string(param.name)}: ${goQueryFormat(go, type)}`)
          .join(', ');
        printer.line(
          `requestURL := buildURL(c.config.ServerURL, op.Path, map[string]string{${pathDict}})`
        );
        printer.line(
          'resp, err := send(ctx, &c.config, requestSpec{OperationID: op.ID, Method: op.Method, URL: requestURL, Headers: authHeaders, Query: query})'
        );
        printer.block(
          'if err != nil {',
          () => {
            printer.line('return nil, nil, err');
          },
          '}'
        );
        printer.block(
          'if resp.StatusCode >= 400 {',
          () => {
            printer.line('return nil, resp, apiErrorFrom(resp, requestURL)');
          },
          '}'
        );
        printer.line('var raw any');
        printer.block(
          'if err := decodeJSON(resp, &raw); err != nil {',
          () => {
            printer.line('return nil, resp, err');
          },
          '}'
        );
        printer.line('return raw, resp, nil');
      },
      '}'
    );
    printer.line('pages := iterPages(call, *op.Pagination, base)');
  };

  printer.line(
    `// ${ident}Pages iterates ${ident} response pages; use with \`for page, err := range\`.`
  );
  printer.block(
    `func (c *Client) ${ident}Pages(${args}) func(yield func(${pageType}, error) bool) {`,
    () => {
      writeCallClosure();
      printer.block(
        `return func(yield func(${pageType}, error) bool) {`,
        () => {
          printer.block(
            'pages(func(raw any, err error) bool {',
            () => {
              printer.line(`var page ${pageType}`);
              printer.block(
                'if err == nil {',
                () => {
                  printer.line('err = reencode(raw, &page)');
                },
                '}'
              );
              printer.line('return yield(page, err)');
            },
            '})'
          );
        },
        '}'
      );
    },
    '}'
  );
  printer.blank();

  printer.line(`// ${ident}Items iterates the items of every ${ident} page.`);
  printer.block(
    `func (c *Client) ${ident}Items(${args}) func(yield func(${itemType}, error) bool) {`,
    () => {
      writeCallClosure();
      printer.block(
        `return func(yield func(${itemType}, error) bool) {`,
        () => {
          printer.block(
            'pages(func(raw any, err error) bool {',
            () => {
              printer.block(
                'if err != nil {',
                () => {
                  printer.line(`var zero ${itemType}`);
                  printer.line('return yield(zero, err)');
                },
                '}'
              );
              printer.line('pageItems, _ := resolvePointer(raw, op.Pagination.Items).([]any)');
              printer.block(
                'for _, item := range pageItems {',
                () => {
                  printer.line(`var typed ${itemType}`);
                  printer.block(
                    'if err := reencode(item, &typed); err != nil {',
                    () => {
                      printer.line('return yield(typed, err)');
                    },
                    '}'
                  );
                  printer.block(
                    'if !yield(typed, nil) {',
                    () => {
                      printer.line('return false');
                    },
                    '}'
                  );
                },
                '}'
              );
              printer.line('return true');
            },
            '})'
          );
        },
        '}'
      );
    },
    '}'
  );
  printer.blank();
}
