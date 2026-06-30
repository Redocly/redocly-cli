import type { SecuritySchemeModel } from '../ir/model.js';
import { pascalCase } from './support.js';
import { constStatement, jsdoc, letStatement, printStatements, ts } from './ts.js';

const { factory } = ts;

/** A scheme whose credential resolves through `__resolve` (bearer or any apiKey). */
function isResolvable(s: SecuritySchemeModel): boolean {
  return s.kind === 'bearer' || s.kind.startsWith('apiKey');
}

/**
 * Emit the credential-injection layer: module-scoped credential slots, the
 * `set*` helpers that update them, and (when an operation is authed) the async
 * `__auth(schemes)` that turns the current slots into the request `headers` and
 * `query` for the schemes an operation accepts.
 *
 * - All `bearer`-kind schemes share one `__bearerToken` slot and one
 *   `setBearer()` helper (`Authorization: Bearer <token>`).
 * - All `basic`-kind schemes share one `__basicAuth` slot (the pre-encoded
 *   base64 `user:pass`) and one `setBasicAuth()` helper.
 * - Each apiKey scheme (header / query / cookie) gets its own slot + setter. The
 *   setter is named `setApiKey` when there's exactly one apiKey scheme of any
 *   `in`, else `setApiKey<Key>`.
 * - Bearer / apiKey credentials are `TokenProvider`s (a value or a possibly-async
 *   function), resolved per request via `__resolve`. `TokenProvider` is emitted
 *   only when such a scheme exists (a basic-only client never references it).
 * - `__resolve` / `__auth` are only emitted when at least one operation is
 *   actually authenticated; setters are always emitted when schemes exist so
 *   callers can wire credentials even for not-yet-used schemes.
 *
 * Returns `''` when the document declares no injectable schemes.
 */
export function renderAuth(
  schemes: SecuritySchemeModel[],
  anyOperationAuthed: boolean,
  exportHelpers: boolean
): string {
  return printStatements(authStatements(schemes, anyOperationAuthed, exportHelpers));
}

/** The credential-injection layer (slots, setters, `__resolve`/`__auth`) as nodes. */
export function authStatements(
  schemes: SecuritySchemeModel[],
  anyOperationAuthed: boolean,
  exportHelpers: boolean
): ts.Statement[] {
  if (schemes.length === 0) return [];

  const hasBearer = schemes.some((s) => s.kind === 'bearer');
  const hasBasic = schemes.some((s) => s.kind === 'basic');
  const hasTokenScheme = schemes.some(isResolvable);
  const apiKeySchemes = schemes.filter(
    (
      s
    ): s is Extract<
      SecuritySchemeModel,
      { kind: 'apiKeyHeader' | 'apiKeyQuery' | 'apiKeyCookie' }
    > => s.kind.startsWith('apiKey')
  );
  const soleApiKey = apiKeySchemes.length === 1;

  const nodes: ts.Statement[] = [];

  if (hasTokenScheme) nodes.push(tokenProviderType());
  nodes.push(authCredentialsType(hasBearer, hasBasic, apiKeySchemes.length > 0));
  if (hasBearer) nodes.push(...bearerBlock());
  if (hasBasic) nodes.push(...basicBlock());
  for (const scheme of apiKeySchemes) {
    nodes.push(...apiKeyBlock(scheme.key, apiKeySetterName(scheme.key, soleApiKey)));
  }

  if (anyOperationAuthed) {
    if (hasTokenScheme) nodes.push(resolveFn());
    nodes.push(authFn(schemes, exportHelpers));
  } else {
    // No operation is authed, so nothing reads the credential slots; the setters
    // above only write them. Under `noUnusedLocals` a write-only `let` trips
    // TS6133, so reference each declared slot in a `void` no-op to keep the
    // emitted file compiling. Setters stay public (callers may wire credentials
    // for not-yet-used schemes), and `authSetterNames` stays consistent. Every
    // scheme kind contributes exactly one slot, so with `schemes.length > 0`
    // this list is always non-empty.
    const slots: string[] = [];
    if (hasBearer) slots.push('__bearerToken');
    if (hasBasic) slots.push('__basicAuth');
    for (const scheme of apiKeySchemes) slots.push(apiKeySlot(scheme.key));
    for (const slot of slots) nodes.push(voidNoOp(slot));
  }

  return nodes;
}

const tokenProviderType_ = 'TokenProvider';

/** `TokenProvider | null` — the type of every resolvable credential slot. */
function tokenProviderOrNull(): ts.TypeNode {
  return factory.createUnionTypeNode([
    factory.createTypeReferenceNode(tokenProviderType_),
    factory.createLiteralTypeNode(factory.createNull()),
  ]);
}

/** `export type TokenProvider = string | (() => string | Promise<string>);` */
function tokenProviderType(): ts.Statement {
  const returns = factory.createUnionTypeNode([
    factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
    factory.createTypeReferenceNode('Promise', [
      factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
    ]),
  ]);
  const fnType = factory.createParenthesizedType(
    factory.createFunctionTypeNode(undefined, [], returns)
  );
  return jsdoc(
    factory.createTypeAliasDeclaration(
      [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      tokenProviderType_,
      undefined,
      factory.createUnionTypeNode([
        factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
        fnType,
      ])
    ),
    'A credential value, or a (possibly async) function that returns one per request.'
  );
}

/**
 * `export type AuthCredentials = { … }` — the per-instance credential shape for
 * `ClientConfig.auth`, with one field per scheme kind the client actually declares.
 */
function authCredentialsType(
  hasBearer: boolean,
  hasBasic: boolean,
  hasApiKey: boolean
): ts.Statement {
  const opt = () => factory.createToken(ts.SyntaxKind.QuestionToken);
  const str = () => factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
  const members: ts.TypeElement[] = [];
  if (hasBearer) {
    members.push(
      factory.createPropertySignature(
        undefined,
        'bearer',
        opt(),
        factory.createTypeReferenceNode(tokenProviderType_)
      )
    );
  }
  if (hasBasic) {
    members.push(
      factory.createPropertySignature(
        undefined,
        'basic',
        opt(),
        factory.createTypeLiteralNode([
          factory.createPropertySignature(undefined, 'username', undefined, str()),
          factory.createPropertySignature(undefined, 'password', undefined, str()),
        ])
      )
    );
  }
  if (hasApiKey) {
    members.push(
      factory.createPropertySignature(
        undefined,
        'apiKey',
        opt(),
        factory.createTypeReferenceNode('Record', [
          str(),
          factory.createTypeReferenceNode(tokenProviderType_),
        ])
      )
    );
  }
  return jsdoc(
    factory.createTypeAliasDeclaration(
      [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      'AuthCredentials',
      undefined,
      factory.createTypeLiteralNode(members)
    ),
    'Per-instance credentials for `ClientConfig.auth`. Each field overrides its module-global\n' +
      '`set*` helper for this config (`apiKey` is keyed by scheme name); omitted fields fall back\n' +
      'to the global slots.'
  );
}

/** `let <name>: <type> = null;` */
function nullableSlot(name: string, type: ts.TypeNode): ts.Statement {
  return letStatement(name, factory.createNull(), type);
}

/** The shared `__bearerToken` slot + `setBearer` setter. */
function bearerBlock(): ts.Statement[] {
  const setter = factory.createFunctionDeclaration(
    [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    undefined,
    'setBearer',
    undefined,
    [
      factory.createParameterDeclaration(
        undefined,
        undefined,
        'token',
        undefined,
        tokenProviderOrNull()
      ),
    ],
    factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword),
    factory.createBlock(
      [
        factory.createExpressionStatement(
          factory.createBinaryExpression(
            factory.createIdentifier('__bearerToken'),
            factory.createToken(ts.SyntaxKind.EqualsToken),
            factory.createIdentifier('token')
          )
        ),
      ],
      true
    )
  );
  return [
    nullableSlot('__bearerToken', tokenProviderOrNull()),
    jsdoc(
      setter,
      'Set (or clear, with `null`) the bearer credential sent as `Authorization: Bearer <token>`\n' +
        'on every operation that accepts bearer / OAuth2 / OpenID Connect auth. Accepts a string or a\n' +
        '(possibly async) function resolved per request.'
    ),
  ];
}

/** The shared `__basicAuth` slot + `setBasicAuth` setter. */
function basicBlock(): ts.Statement[] {
  // `btoa(`${username}:${password}`)`
  const encode = factory.createCallExpression(factory.createIdentifier('btoa'), undefined, [
    factory.createTemplateExpression(factory.createTemplateHead(''), [
      factory.createTemplateSpan(
        factory.createIdentifier('username'),
        factory.createTemplateMiddle(':')
      ),
      factory.createTemplateSpan(
        factory.createIdentifier('password'),
        factory.createTemplateTail('')
      ),
    ]),
  ]);
  const setter = factory.createFunctionDeclaration(
    [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    undefined,
    'setBasicAuth',
    undefined,
    [
      factory.createParameterDeclaration(
        undefined,
        undefined,
        'username',
        undefined,
        factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
      ),
      factory.createParameterDeclaration(
        undefined,
        undefined,
        'password',
        undefined,
        factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
      ),
    ],
    factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword),
    factory.createBlock(
      [
        factory.createExpressionStatement(
          factory.createBinaryExpression(
            factory.createIdentifier('__basicAuth'),
            factory.createToken(ts.SyntaxKind.EqualsToken),
            encode
          )
        ),
      ],
      true
    )
  );
  return [
    nullableSlot(
      '__basicAuth',
      factory.createUnionTypeNode([
        factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
        factory.createLiteralTypeNode(factory.createNull()),
      ])
    ),
    jsdoc(setter, 'Set HTTP Basic credentials sent as `Authorization: Basic <base64>`.'),
  ];
}

/** A per-apiKey scheme slot + its setter. */
function apiKeyBlock(key: string, setterName: string): ts.Statement[] {
  const slot = apiKeySlot(key);
  const setter = factory.createFunctionDeclaration(
    [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    undefined,
    setterName,
    undefined,
    [
      factory.createParameterDeclaration(
        undefined,
        undefined,
        'key',
        undefined,
        tokenProviderOrNull()
      ),
    ],
    factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword),
    factory.createBlock(
      [
        factory.createExpressionStatement(
          factory.createBinaryExpression(
            factory.createIdentifier(slot),
            factory.createToken(ts.SyntaxKind.EqualsToken),
            factory.createIdentifier('key')
          )
        ),
      ],
      true
    )
  );
  return [
    nullableSlot(slot, tokenProviderOrNull()),
    jsdoc(
      setter,
      `Set (or clear, with \`null\`) the credential for the \`${key}\` API-key scheme. Accepts a\n` +
        'string or a (possibly async) function resolved per request.'
    ),
  ];
}

/**
 * `async function __resolve(slot: TokenProvider | null): Promise<string | null> {
 *    if (slot === null) return null;
 *    return typeof slot === 'function' ? slot() : slot;
 *  }`
 */
function resolveFn(): ts.Statement {
  const slotRef = factory.createIdentifier('slot');
  const body = factory.createBlock(
    [
      factory.createIfStatement(
        factory.createBinaryExpression(
          slotRef,
          factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
          factory.createNull()
        ),
        factory.createReturnStatement(factory.createNull())
      ),
      factory.createReturnStatement(
        factory.createConditionalExpression(
          factory.createBinaryExpression(
            factory.createTypeOfExpression(slotRef),
            factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
            factory.createStringLiteral('function')
          ),
          factory.createToken(ts.SyntaxKind.QuestionToken),
          factory.createCallExpression(slotRef, undefined, []),
          factory.createToken(ts.SyntaxKind.ColonToken),
          slotRef
        )
      ),
    ],
    true
  );
  return jsdoc(
    factory.createFunctionDeclaration(
      [factory.createModifier(ts.SyntaxKind.AsyncKeyword)],
      undefined,
      '__resolve',
      undefined,
      [
        factory.createParameterDeclaration(
          undefined,
          undefined,
          'slot',
          undefined,
          tokenProviderOrNull()
        ),
      ],
      factory.createTypeReferenceNode('Promise', [
        factory.createUnionTypeNode([
          factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
          factory.createLiteralTypeNode(factory.createNull()),
        ]),
      ]),
      body
    ),
    'Resolve a credential slot to a string (awaiting an async token function), or `null` when unset.'
  );
}

/** `const v = await __resolve(<source>);` — the per-case credential resolve. */
function resolveConst(source: ts.Expression): ts.Statement {
  return constStatement(
    'v',
    factory.createAwaitExpression(
      factory.createCallExpression(factory.createIdentifier('__resolve'), undefined, [source])
    )
  );
}

/** `config.auth?.<prop>` — optional access into the per-instance credentials. */
function configAuth(prop: string): ts.Expression {
  return factory.createPropertyAccessChain(
    factory.createPropertyAccessExpression(factory.createIdentifier('config'), 'auth'),
    factory.createToken(ts.SyntaxKind.QuestionDotToken),
    prop
  );
}

/** `config.auth?.apiKey?.["<key>"]` — the per-instance apiKey credential for a scheme. */
function configApiKey(key: string): ts.Expression {
  return factory.createElementAccessChain(
    factory.createPropertyAccessChain(
      factory.createPropertyAccessExpression(factory.createIdentifier('config'), 'auth'),
      factory.createToken(ts.SyntaxKind.QuestionDotToken),
      'apiKey'
    ),
    factory.createToken(ts.SyntaxKind.QuestionDotToken),
    factory.createStringLiteral(key)
  );
}

/** `<perInstance> ?? <globalSlot>` — prefer the config's credential, fall back to the module slot. */
function preferConfig(perInstance: ts.Expression, globalSlot: string): ts.Expression {
  return factory.createBinaryExpression(
    perInstance,
    factory.createToken(ts.SyntaxKind.QuestionQuestionToken),
    factory.createIdentifier(globalSlot)
  );
}

/** `<target>[<key>] = <value>;` (string-literal element access). */
function assignElement(target: string, key: string, value: ts.Expression): ts.Statement {
  return factory.createExpressionStatement(
    factory.createBinaryExpression(
      factory.createElementAccessExpression(
        factory.createIdentifier(target),
        factory.createStringLiteral(key)
      ),
      factory.createToken(ts.SyntaxKind.EqualsToken),
      value
    )
  );
}

/** `if (v !== null) <then>` — guard a resolved credential before injecting it. */
function ifVResolved(then: ts.Statement): ts.Statement {
  return factory.createIfStatement(
    factory.createBinaryExpression(
      factory.createIdentifier('v'),
      factory.createToken(ts.SyntaxKind.ExclamationEqualsEqualsToken),
      factory.createNull()
    ),
    then
  );
}

/** The per-scheme `case "<key>":` clause that injects that scheme's credential. */
function authCase(scheme: SecuritySchemeModel): ts.CaseClause {
  const key = factory.createStringLiteral(scheme.key);
  const breakStmt = factory.createBreakStatement();

  if (scheme.kind === 'bearer') {
    // `const v = await __resolve(__bearerToken); if (v !== null) headers['Authorization'] = `Bearer ${v}`;`
    const bearerValue = factory.createTemplateExpression(factory.createTemplateHead('Bearer '), [
      factory.createTemplateSpan(factory.createIdentifier('v'), factory.createTemplateTail('')),
    ]);
    return factory.createCaseClause(key, [
      factory.createBlock(
        [
          resolveConst(preferConfig(configAuth('bearer'), '__bearerToken')),
          ifVResolved(assignElement('headers', 'Authorization', bearerValue)),
          breakStmt,
        ],
        true
      ),
    ]);
  }

  if (scheme.kind === 'basic') {
    // Prefer per-instance `config.auth.basic` ({ username, password }, encoded here)
    // over the module-global pre-encoded `__basicAuth`:
    //   const b = config.auth?.basic;
    //   const basic = b ? btoa(`${b.username}:${b.password}`) : __basicAuth;
    //   if (basic !== null) headers['Authorization'] = `Basic ${basic}`;
    const bDecl = constStatement('b', configAuth('basic'));
    const encodeB = factory.createCallExpression(factory.createIdentifier('btoa'), undefined, [
      factory.createTemplateExpression(factory.createTemplateHead(''), [
        factory.createTemplateSpan(
          factory.createPropertyAccessExpression(factory.createIdentifier('b'), 'username'),
          factory.createTemplateMiddle(':')
        ),
        factory.createTemplateSpan(
          factory.createPropertyAccessExpression(factory.createIdentifier('b'), 'password'),
          factory.createTemplateTail('')
        ),
      ]),
    ]);
    const basicDecl = constStatement(
      'basic',
      factory.createConditionalExpression(
        factory.createIdentifier('b'),
        factory.createToken(ts.SyntaxKind.QuestionToken),
        encodeB,
        factory.createToken(ts.SyntaxKind.ColonToken),
        factory.createIdentifier('__basicAuth')
      )
    );
    const basicValue = factory.createTemplateExpression(factory.createTemplateHead('Basic '), [
      factory.createTemplateSpan(factory.createIdentifier('basic'), factory.createTemplateTail('')),
    ]);
    return factory.createCaseClause(key, [
      factory.createBlock(
        [
          bDecl,
          basicDecl,
          factory.createIfStatement(
            factory.createBinaryExpression(
              factory.createIdentifier('basic'),
              factory.createToken(ts.SyntaxKind.ExclamationEqualsEqualsToken),
              factory.createNull()
            ),
            assignElement('headers', 'Authorization', basicValue)
          ),
          breakStmt,
        ],
        true
      ),
    ]);
  }

  const slot = apiKeySlot(scheme.key);
  const v = factory.createIdentifier('v');

  if (scheme.kind === 'apiKeyHeader') {
    return factory.createCaseClause(key, [
      factory.createBlock(
        [
          resolveConst(preferConfig(configApiKey(scheme.key), slot)),
          ifVResolved(assignElement('headers', scheme.headerName, v)),
          breakStmt,
        ],
        true
      ),
    ]);
  }

  if (scheme.kind === 'apiKeyQuery') {
    return factory.createCaseClause(key, [
      factory.createBlock(
        [
          resolveConst(preferConfig(configApiKey(scheme.key), slot)),
          ifVResolved(assignElement('query', scheme.paramName, v)),
          breakStmt,
        ],
        true
      ),
    ]);
  }

  // apiKeyCookie: `cookies.push(<JSON-string of name+'='> + v)`. The name is a
  // string literal concatenated with the runtime value — never interpolated into
  // a backtick template, which a cookieName containing a backtick or `${` could
  // break out of.
  const push = factory.createExpressionStatement(
    factory.createCallExpression(
      factory.createPropertyAccessExpression(factory.createIdentifier('cookies'), 'push'),
      undefined,
      [
        factory.createBinaryExpression(
          factory.createStringLiteral(scheme.cookieName + '='),
          factory.createToken(ts.SyntaxKind.PlusToken),
          v
        ),
      ]
    )
  );
  return factory.createCaseClause(key, [
    factory.createBlock(
      [resolveConst(preferConfig(configApiKey(scheme.key), slot)), ifVResolved(push), breakStmt],
      true
    ),
  ]);
}

/** The async `__auth(schemes)` that builds request headers/query from the slots. */
function authFn(schemes: SecuritySchemeModel[], exportHelpers: boolean): ts.Statement {
  const recordStringString = factory.createTypeReferenceNode('Record', [
    factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
    factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
  ]);

  const declare = (name: string, type: ts.TypeNode, init: ts.Expression): ts.Statement =>
    constStatement(name, init, type);

  const loop = factory.createForOfStatement(
    undefined,
    factory.createVariableDeclarationList(
      [factory.createVariableDeclaration('scheme')],
      ts.NodeFlags.Const
    ),
    factory.createIdentifier('schemes'),
    factory.createBlock(
      [
        factory.createSwitchStatement(
          factory.createIdentifier('scheme'),
          factory.createCaseBlock(schemes.map(authCase))
        ),
      ],
      true
    )
  );

  // `if (cookies.length > 0) headers['Cookie'] = cookies.join('; ');`
  const cookieJoin = factory.createIfStatement(
    factory.createBinaryExpression(
      factory.createPropertyAccessExpression(factory.createIdentifier('cookies'), 'length'),
      factory.createToken(ts.SyntaxKind.GreaterThanToken),
      factory.createNumericLiteral('0')
    ),
    assignElement(
      'headers',
      'Cookie',
      factory.createCallExpression(
        factory.createPropertyAccessExpression(factory.createIdentifier('cookies'), 'join'),
        undefined,
        [factory.createStringLiteral('; ')]
      )
    )
  );

  const ret = factory.createReturnStatement(
    factory.createObjectLiteralExpression(
      [
        factory.createShorthandPropertyAssignment('headers'),
        factory.createShorthandPropertyAssignment('query'),
      ],
      false
    )
  );

  const returnType = factory.createTypeReferenceNode('Promise', [
    factory.createTypeLiteralNode([
      factory.createPropertySignature(undefined, 'headers', undefined, recordStringString),
      factory.createPropertySignature(undefined, 'query', undefined, recordStringString),
    ]),
  ]);

  const modifiers: ts.ModifierLike[] = [];
  if (exportHelpers) modifiers.push(factory.createModifier(ts.SyntaxKind.ExportKeyword));
  modifiers.push(factory.createModifier(ts.SyntaxKind.AsyncKeyword));

  return jsdoc(
    factory.createFunctionDeclaration(
      modifiers,
      undefined,
      '__auth',
      undefined,
      [
        factory.createParameterDeclaration(
          undefined,
          undefined,
          'schemes',
          undefined,
          factory.createArrayTypeNode(factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword))
        ),
        factory.createParameterDeclaration(
          undefined,
          undefined,
          'config',
          undefined,
          factory.createTypeReferenceNode('ClientConfig')
        ),
      ],
      returnType,
      factory.createBlock(
        [
          declare('headers', recordStringString, factory.createObjectLiteralExpression([], false)),
          declare('query', recordStringString, factory.createObjectLiteralExpression([], false)),
          declare(
            'cookies',
            factory.createArrayTypeNode(factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)),
            factory.createArrayLiteralExpression([], false)
          ),
          loop,
          cookieJoin,
          ret,
        ],
        true
      )
    ),
    'Build the auth `headers` and `query` for an operation from the currently-set credentials.\n' +
      'Only the schemes the operation accepts are consulted; unset slots contribute nothing. Callers\n' +
      'can always override by passing their own `init.headers`.'
  );
}

/** `void <slot>;` — keep a write-only slot from tripping `noUnusedLocals`. */
function voidNoOp(slot: string): ts.Statement {
  return factory.createExpressionStatement(
    factory.createVoidExpression(factory.createIdentifier(slot))
  );
}

/** Module-scoped variable name backing an apiKey scheme's current value. */
function apiKeySlot(key: string): string {
  return `__apiKey_${key.replace(/[^A-Za-z0-9]/g, '_')}`;
}

/**
 * Public setter name for an apiKey scheme: `setApiKey` when it's the only apiKey
 * scheme (of any `in`), else `setApiKey<Key>` to disambiguate.
 */
function apiKeySetterName(key: string, sole: boolean): string {
  return sole ? 'setApiKey' : `setApiKey${pascalCase(key)}`;
}

/**
 * The public type names `renderAuth` exports for a set of schemes — `TokenProvider`
 * when any bearer/apiKey scheme exists, else none. Multi-file writers re-export
 * these from the entry module's type barrel.
 */
export function authTypeNames(schemes: SecuritySchemeModel[]): string[] {
  if (schemes.length === 0) return [];
  const names: string[] = [];
  if (schemes.some(isResolvable)) names.push('TokenProvider');
  names.push('AuthCredentials');
  return names;
}

/**
 * The public credential-setter names `renderAuth` exports for a set of schemes,
 * in emission order (`setBearer`, then `setBasicAuth`, then each apiKey setter).
 * Multi-file writers re-export these from the entry module so callers still get
 * one import.
 */
export function authSetterNames(schemes: SecuritySchemeModel[]): string[] {
  const names: string[] = [];
  if (schemes.some((s) => s.kind === 'bearer')) names.push('setBearer');
  if (schemes.some((s) => s.kind === 'basic')) names.push('setBasicAuth');
  const apiKeySchemes = schemes.filter((s) => s.kind.startsWith('apiKey'));
  for (const scheme of apiKeySchemes) {
    names.push(apiKeySetterName(scheme.key, apiKeySchemes.length === 1));
  }
  return names;
}
