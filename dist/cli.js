var tr, Pr;
function Gt() {
  if (Pr) return tr;
  Pr = 1;
  function e(i) {
    if (typeof i != 'string')
      throw new TypeError('Path must be a string. Received ' + JSON.stringify(i));
  }
  function r(i, n) {
    for (var o = '', a = 0, l = -1, p = 0, c, f = 0; f <= i.length; ++f) {
      if (f < i.length) c = i.charCodeAt(f);
      else {
        if (c === 47) break;
        c = 47;
      }
      if (c === 47) {
        if (!(l === f - 1 || p === 1))
          if (l !== f - 1 && p === 2) {
            if (
              o.length < 2 ||
              a !== 2 ||
              o.charCodeAt(o.length - 1) !== 46 ||
              o.charCodeAt(o.length - 2) !== 46
            ) {
              if (o.length > 2) {
                var u = o.lastIndexOf('/');
                if (u !== o.length - 1) {
                  u === -1
                    ? ((o = ''), (a = 0))
                    : ((o = o.slice(0, u)), (a = o.length - 1 - o.lastIndexOf('/'))),
                    (l = f),
                    (p = 0);
                  continue;
                }
              } else if (o.length === 2 || o.length === 1) {
                (o = ''), (a = 0), (l = f), (p = 0);
                continue;
              }
            }
            n && (o.length > 0 ? (o += '/..') : (o = '..'), (a = 2));
          } else
            o.length > 0 ? (o += '/' + i.slice(l + 1, f)) : (o = i.slice(l + 1, f)),
              (a = f - l - 1);
        (l = f), (p = 0);
      } else c === 46 && p !== -1 ? ++p : (p = -1);
    }
    return o;
  }
  function t(i, n) {
    var o = n.dir || n.root,
      a = n.base || (n.name || '') + (n.ext || '');
    return o ? (o === n.root ? o + a : o + i + a) : a;
  }
  var s = {
    // path.resolve([from ...], to)
    resolve: function () {
      for (var n = '', o = !1, a, l = arguments.length - 1; l >= -1 && !o; l--) {
        var p;
        l >= 0 ? (p = arguments[l]) : (a === void 0 && (a = process.cwd()), (p = a)),
          e(p),
          p.length !== 0 && ((n = p + '/' + n), (o = p.charCodeAt(0) === 47));
      }
      return (n = r(n, !o)), o ? (n.length > 0 ? '/' + n : '/') : n.length > 0 ? n : '.';
    },
    normalize: function (n) {
      if ((e(n), n.length === 0)) return '.';
      var o = n.charCodeAt(0) === 47,
        a = n.charCodeAt(n.length - 1) === 47;
      return (
        (n = r(n, !o)),
        n.length === 0 && !o && (n = '.'),
        n.length > 0 && a && (n += '/'),
        o ? '/' + n : n
      );
    },
    isAbsolute: function (n) {
      return e(n), n.length > 0 && n.charCodeAt(0) === 47;
    },
    join: function () {
      if (arguments.length === 0) return '.';
      for (var n, o = 0; o < arguments.length; ++o) {
        var a = arguments[o];
        e(a), a.length > 0 && (n === void 0 ? (n = a) : (n += '/' + a));
      }
      return n === void 0 ? '.' : s.normalize(n);
    },
    relative: function (n, o) {
      if ((e(n), e(o), n === o || ((n = s.resolve(n)), (o = s.resolve(o)), n === o))) return '';
      for (var a = 1; a < n.length && n.charCodeAt(a) === 47; ++a);
      for (var l = n.length, p = l - a, c = 1; c < o.length && o.charCodeAt(c) === 47; ++c);
      for (var f = o.length, u = f - c, d = p < u ? p : u, m = -1, x = 0; x <= d; ++x) {
        if (x === d) {
          if (u > d) {
            if (o.charCodeAt(c + x) === 47) return o.slice(c + x + 1);
            if (x === 0) return o.slice(c + x);
          } else p > d && (n.charCodeAt(a + x) === 47 ? (m = x) : x === 0 && (m = 0));
          break;
        }
        var S = n.charCodeAt(a + x),
          A = o.charCodeAt(c + x);
        if (S !== A) break;
        S === 47 && (m = x);
      }
      var v = '';
      for (x = a + m + 1; x <= l; ++x)
        (x === l || n.charCodeAt(x) === 47) && (v.length === 0 ? (v += '..') : (v += '/..'));
      return v.length > 0
        ? v + o.slice(c + m)
        : ((c += m), o.charCodeAt(c) === 47 && ++c, o.slice(c));
    },
    _makeLong: function (n) {
      return n;
    },
    dirname: function (n) {
      if ((e(n), n.length === 0)) return '.';
      for (var o = n.charCodeAt(0), a = o === 47, l = -1, p = !0, c = n.length - 1; c >= 1; --c)
        if (((o = n.charCodeAt(c)), o === 47)) {
          if (!p) {
            l = c;
            break;
          }
        } else p = !1;
      return l === -1 ? (a ? '/' : '.') : a && l === 1 ? '//' : n.slice(0, l);
    },
    basename: function (n, o) {
      if (o !== void 0 && typeof o != 'string')
        throw new TypeError('"ext" argument must be a string');
      e(n);
      var a = 0,
        l = -1,
        p = !0,
        c;
      if (o !== void 0 && o.length > 0 && o.length <= n.length) {
        if (o.length === n.length && o === n) return '';
        var f = o.length - 1,
          u = -1;
        for (c = n.length - 1; c >= 0; --c) {
          var d = n.charCodeAt(c);
          if (d === 47) {
            if (!p) {
              a = c + 1;
              break;
            }
          } else
            u === -1 && ((p = !1), (u = c + 1)),
              f >= 0 && (d === o.charCodeAt(f) ? --f === -1 && (l = c) : ((f = -1), (l = u)));
        }
        return a === l ? (l = u) : l === -1 && (l = n.length), n.slice(a, l);
      } else {
        for (c = n.length - 1; c >= 0; --c)
          if (n.charCodeAt(c) === 47) {
            if (!p) {
              a = c + 1;
              break;
            }
          } else l === -1 && ((p = !1), (l = c + 1));
        return l === -1 ? '' : n.slice(a, l);
      }
    },
    extname: function (n) {
      e(n);
      for (var o = -1, a = 0, l = -1, p = !0, c = 0, f = n.length - 1; f >= 0; --f) {
        var u = n.charCodeAt(f);
        if (u === 47) {
          if (!p) {
            a = f + 1;
            break;
          }
          continue;
        }
        l === -1 && ((p = !1), (l = f + 1)),
          u === 46 ? (o === -1 ? (o = f) : c !== 1 && (c = 1)) : o !== -1 && (c = -1);
      }
      return o === -1 ||
        l === -1 || // We saw a non-dot character immediately before the dot
        c === 0 || // The (right-most) trimmed path component is exactly '..'
        (c === 1 && o === l - 1 && o === a + 1)
        ? ''
        : n.slice(o, l);
    },
    format: function (n) {
      if (n === null || typeof n != 'object')
        throw new TypeError(
          'The "pathObject" argument must be of type Object. Received type ' + typeof n
        );
      return t('/', n);
    },
    parse: function (n) {
      e(n);
      var o = { root: '', dir: '', base: '', ext: '', name: '' };
      if (n.length === 0) return o;
      var a = n.charCodeAt(0),
        l = a === 47,
        p;
      l ? ((o.root = '/'), (p = 1)) : (p = 0);
      for (var c = -1, f = 0, u = -1, d = !0, m = n.length - 1, x = 0; m >= p; --m) {
        if (((a = n.charCodeAt(m)), a === 47)) {
          if (!d) {
            f = m + 1;
            break;
          }
          continue;
        }
        u === -1 && ((d = !1), (u = m + 1)),
          a === 46 ? (c === -1 ? (c = m) : x !== 1 && (x = 1)) : c !== -1 && (x = -1);
      }
      return (
        c === -1 ||
        u === -1 || // We saw a non-dot character immediately before the dot
        x === 0 || // The (right-most) trimmed path component is exactly '..'
        (x === 1 && c === u - 1 && c === f + 1)
          ? u !== -1 &&
            (f === 0 && l ? (o.base = o.name = n.slice(1, u)) : (o.base = o.name = n.slice(f, u)))
          : (f === 0 && l
              ? ((o.name = n.slice(1, c)), (o.base = n.slice(1, u)))
              : ((o.name = n.slice(f, c)), (o.base = n.slice(f, u))),
            (o.ext = n.slice(c, u))),
        f > 0 ? (o.dir = n.slice(0, f - 1)) : l && (o.dir = '/'),
        o
      );
    },
    sep: '/',
    delimiter: ':',
    win32: null,
    posix: null,
  };
  return (s.posix = s), (tr = s), tr;
}
var me = Gt();
function ut(e) {
  return !!e;
}
function Ee(e) {
  return e !== null && typeof e == 'object' && !Array.isArray(e);
}
function we(e, r) {
  return e === '' && (e = '#/'), e[e.length - 1] === '/' ? e + r : e + '/' + r;
}
function ye(e) {
  return Ee(e) && typeof e.$ref == 'string';
}
function ct(e) {
  return Ee(e) && typeof e.externalValue == 'string';
}
class Me {
  constructor(r, t) {
    (this.source = r), (this.pointer = t);
  }
  child(r) {
    return new Me(this.source, we(this.pointer, (Array.isArray(r) ? r : [r]).map(ze).join('/')));
  }
  key() {
    return { ...this, reportOnKey: !0 };
  }
  get absolutePointer() {
    return this.source.absoluteRef + (this.pointer === '#/' ? '' : this.pointer);
  }
}
function Vt(e) {
  return decodeURIComponent(e.replace(/~1/g, '/').replace(/~0/g, '~'));
}
function ze(e) {
  return typeof e == 'number' ? e : e.replace(/~/g, '~0').replace(/\//g, '~1');
}
function Kt(e) {
  const [r, t = ''] = e.split('#/');
  return {
    uri: (r.endsWith('#') ? r.slice(0, -1) : r) || null,
    pointer: Yt(t),
  };
}
function Yt(e) {
  return e.split('/').map(Vt).filter(ut);
}
function Wt(e) {
  const r = e.split(/[\/\\]/);
  return r[r.length - 1].replace(/\.[^.]+$/, '');
}
function Te(e) {
  return e.startsWith('http://') || e.startsWith('https://');
}
function Xt(e) {
  return (
    e.startsWith('#') ||
    e.startsWith('https://') ||
    e.startsWith('http://') ||
    e.startsWith('./') ||
    e.startsWith('../') ||
    e.indexOf('/') > -1
  );
}
function Qt(e) {
  return /^#[A-Za-z][A-Za-z0-9\-_:.]*$/.test(e);
}
function Or(e, r, t) {
  if (!Ee(r.node)) t.parent[t.key] = r.node;
  else {
    delete e.$ref;
    const s = Object.assign({}, r.node, e);
    Object.assign(e, s);
  }
}
function K(e) {
  return {
    name: `${e}List`,
    properties: {},
    items: e,
  };
}
function z(e) {
  return {
    name: `${e}Map`,
    properties: {},
    additionalProperties: () => e,
  };
}
const Le = {
  name: 'SpecExtension',
  properties: {},
  // skip validation of additional properties for unknown extensions
  additionalProperties: { resolvable: !0 },
};
function Zt(e, r = {}) {
  const t = {};
  for (const n of Object.keys(e))
    t[n] = {
      ...e[n],
      name: n,
    };
  for (const n of Object.values(t)) s(n);
  return (t.SpecExtension = Le), t;
  function s(n) {
    if (
      (n.additionalProperties && (n.additionalProperties = i(n.additionalProperties)),
      n.items && (n.items = i(n.items)),
      n.properties)
    ) {
      const o = {};
      for (const [a, l] of Object.entries(n.properties))
        (o[a] = i(l)),
          r.doNotResolveExamples &&
            l &&
            l.isExample &&
            (o[a] = {
              ...l,
              resolvable: !1,
            });
      n.properties = o;
    }
  }
  function i(n) {
    if (typeof n == 'string') {
      if (!t[n]) throw new Error(`Unknown type name found: ${n}`);
      return t[n];
    } else
      return typeof n == 'function'
        ? (o, a) => i(n(o, a))
        : n && n.name
        ? ((n = { ...n }), s(n), n)
        : n && n.directResolveAs
        ? {
            ...n,
            directResolveAs: i(n.directResolveAs),
          }
        : n;
  }
}
function ke(e) {
  return typeof e?.name == 'string';
}
function pt(e, r) {
  return e.hasOwnProperty(r) ? e[r] : void 0;
}
var nr = {},
  ir,
  Tr;
function Ze() {
  if (Tr) return ir;
  Tr = 1;
  const e = '\\\\/',
    r = `[^${e}]`,
    t = '\\.',
    s = '\\+',
    i = '\\?',
    n = '\\/',
    o = '(?=.)',
    a = '[^/]',
    l = `(?:${n}|$)`,
    p = `(?:^|${n})`,
    c = `${t}{1,2}${l}`,
    f = `(?!${t})`,
    u = `(?!${p}${c})`,
    d = `(?!${t}{0,1}${l})`,
    m = `(?!${c})`,
    x = `[^.${n}]`,
    S = `${a}*?`,
    v = {
      DOT_LITERAL: t,
      PLUS_LITERAL: s,
      QMARK_LITERAL: i,
      SLASH_LITERAL: n,
      ONE_CHAR: o,
      QMARK: a,
      END_ANCHOR: l,
      DOTS_SLASH: c,
      NO_DOT: f,
      NO_DOTS: u,
      NO_DOT_SLASH: d,
      NO_DOTS_SLASH: m,
      QMARK_NO_DOT: x,
      STAR: S,
      START_ANCHOR: p,
      SEP: '/',
    },
    D = {
      ...v,
      SLASH_LITERAL: `[${e}]`,
      QMARK: r,
      STAR: `${r}*?`,
      DOTS_SLASH: `${t}{1,2}(?:[${e}]|$)`,
      NO_DOT: `(?!${t})`,
      NO_DOTS: `(?!(?:^|[${e}])${t}{1,2}(?:[${e}]|$))`,
      NO_DOT_SLASH: `(?!${t}{0,1}(?:[${e}]|$))`,
      NO_DOTS_SLASH: `(?!${t}{1,2}(?:[${e}]|$))`,
      QMARK_NO_DOT: `[^.${e}]`,
      START_ANCHOR: `(?:^|[${e}])`,
      END_ANCHOR: `(?:[${e}]|$)`,
      SEP: '\\',
    },
    U = {
      alnum: 'a-zA-Z0-9',
      alpha: 'a-zA-Z',
      ascii: '\\x00-\\x7F',
      blank: ' \\t',
      cntrl: '\\x00-\\x1F\\x7F',
      digit: '0-9',
      graph: '\\x21-\\x7E',
      lower: 'a-z',
      print: '\\x20-\\x7E ',
      punct: '\\-!"#$%&\'()\\*+,./:;<=>?@[\\]^_`{|}~',
      space: ' \\t\\r\\n\\v\\f',
      upper: 'A-Z',
      word: 'A-Za-z0-9_',
      xdigit: 'A-Fa-f0-9',
    };
  return (
    (ir = {
      MAX_LENGTH: 1024 * 64,
      POSIX_REGEX_SOURCE: U,
      // regular expressions
      REGEX_BACKSLASH: /\\(?![*+?^${}(|)[\]])/g,
      REGEX_NON_SPECIAL_CHARS: /^[^@![\].,$*+?^{}()|\\/]+/,
      REGEX_SPECIAL_CHARS: /[-*+?.^${}(|)[\]]/,
      REGEX_SPECIAL_CHARS_BACKREF: /(\\?)((\W)(\3*))/g,
      REGEX_SPECIAL_CHARS_GLOBAL: /([-*+?.^${}(|)[\]])/g,
      REGEX_REMOVE_BACKSLASH: /(?:\[.*?[^\\]\]|\\(?=.))/g,
      // Replace globs with equivalent patterns to reduce parsing time.
      REPLACEMENTS: {
        __proto__: null,
        '***': '*',
        '**/**': '**',
        '**/**/**': '**',
      },
      // Digits
      CHAR_0: 48,
      /* 0 */
      CHAR_9: 57,
      /* 9 */
      // Alphabet chars.
      CHAR_UPPERCASE_A: 65,
      /* A */
      CHAR_LOWERCASE_A: 97,
      /* a */
      CHAR_UPPERCASE_Z: 90,
      /* Z */
      CHAR_LOWERCASE_Z: 122,
      /* z */
      CHAR_LEFT_PARENTHESES: 40,
      /* ( */
      CHAR_RIGHT_PARENTHESES: 41,
      /* ) */
      CHAR_ASTERISK: 42,
      /* * */
      // Non-alphabetic chars.
      CHAR_AMPERSAND: 38,
      /* & */
      CHAR_AT: 64,
      /* @ */
      CHAR_BACKWARD_SLASH: 92,
      /* \ */
      CHAR_CARRIAGE_RETURN: 13,
      /* \r */
      CHAR_CIRCUMFLEX_ACCENT: 94,
      /* ^ */
      CHAR_COLON: 58,
      /* : */
      CHAR_COMMA: 44,
      /* , */
      CHAR_DOT: 46,
      /* . */
      CHAR_DOUBLE_QUOTE: 34,
      /* " */
      CHAR_EQUAL: 61,
      /* = */
      CHAR_EXCLAMATION_MARK: 33,
      /* ! */
      CHAR_FORM_FEED: 12,
      /* \f */
      CHAR_FORWARD_SLASH: 47,
      /* / */
      CHAR_GRAVE_ACCENT: 96,
      /* ` */
      CHAR_HASH: 35,
      /* # */
      CHAR_HYPHEN_MINUS: 45,
      /* - */
      CHAR_LEFT_ANGLE_BRACKET: 60,
      /* < */
      CHAR_LEFT_CURLY_BRACE: 123,
      /* { */
      CHAR_LEFT_SQUARE_BRACKET: 91,
      /* [ */
      CHAR_LINE_FEED: 10,
      /* \n */
      CHAR_NO_BREAK_SPACE: 160,
      /* \u00A0 */
      CHAR_PERCENT: 37,
      /* % */
      CHAR_PLUS: 43,
      /* + */
      CHAR_QUESTION_MARK: 63,
      /* ? */
      CHAR_RIGHT_ANGLE_BRACKET: 62,
      /* > */
      CHAR_RIGHT_CURLY_BRACE: 125,
      /* } */
      CHAR_RIGHT_SQUARE_BRACKET: 93,
      /* ] */
      CHAR_SEMICOLON: 59,
      /* ; */
      CHAR_SINGLE_QUOTE: 39,
      /* ' */
      CHAR_SPACE: 32,
      /*   */
      CHAR_TAB: 9,
      /* \t */
      CHAR_UNDERSCORE: 95,
      /* _ */
      CHAR_VERTICAL_LINE: 124,
      /* | */
      CHAR_ZERO_WIDTH_NOBREAK_SPACE: 65279,
      /* \uFEFF */
      /**
       * Create EXTGLOB_CHARS
       */
      extglobChars(M) {
        return {
          '!': { type: 'negate', open: '(?:(?!(?:', close: `))${M.STAR})` },
          '?': { type: 'qmark', open: '(?:', close: ')?' },
          '+': { type: 'plus', open: '(?:', close: ')+' },
          '*': { type: 'star', open: '(?:', close: ')*' },
          '@': { type: 'at', open: '(?:', close: ')' },
        };
      },
      /**
       * Create GLOB_CHARS
       */
      globChars(M) {
        return M === !0 ? D : v;
      },
    }),
    ir
  );
}
var Lr;
function Je() {
  return (
    Lr ||
      ((Lr = 1),
      (function (e) {
        const {
          REGEX_BACKSLASH: r,
          REGEX_REMOVE_BACKSLASH: t,
          REGEX_SPECIAL_CHARS: s,
          REGEX_SPECIAL_CHARS_GLOBAL: i,
        } = /* @__PURE__ */ Ze();
        (e.isObject = (n) => n !== null && typeof n == 'object' && !Array.isArray(n)),
          (e.hasRegexChars = (n) => s.test(n)),
          (e.isRegexChar = (n) => n.length === 1 && e.hasRegexChars(n)),
          (e.escapeRegex = (n) => n.replace(i, '\\$1')),
          (e.toPosixSlashes = (n) => n.replace(r, '/')),
          (e.isWindows = () => {
            if (typeof navigator < 'u' && navigator.platform) {
              const n = navigator.platform.toLowerCase();
              return n === 'win32' || n === 'windows';
            }
            return typeof process < 'u' && process.platform ? process.platform === 'win32' : !1;
          }),
          (e.removeBackslashes = (n) => n.replace(t, (o) => (o === '\\' ? '' : o))),
          (e.escapeLast = (n, o, a) => {
            const l = n.lastIndexOf(o, a);
            return l === -1
              ? n
              : n[l - 1] === '\\'
              ? e.escapeLast(n, o, l - 1)
              : `${n.slice(0, l)}\\${n.slice(l)}`;
          }),
          (e.removePrefix = (n, o = {}) => {
            let a = n;
            return a.startsWith('./') && ((a = a.slice(2)), (o.prefix = './')), a;
          }),
          (e.wrapOutput = (n, o = {}, a = {}) => {
            const l = a.contains ? '' : '^',
              p = a.contains ? '' : '$';
            let c = `${l}(?:${n})${p}`;
            return o.negated === !0 && (c = `(?:^(?!${c}).*$)`), c;
          }),
          (e.basename = (n, { windows: o } = {}) => {
            const a = n.split(o ? /[\\/]/ : '/'),
              l = a[a.length - 1];
            return l === '' ? a[a.length - 2] : l;
          });
      })(nr)),
    nr
  );
}
var or, kr;
function Jt() {
  if (kr) return or;
  kr = 1;
  const e = /* @__PURE__ */ Je(),
    {
      CHAR_ASTERISK: r,
      /* * */
      CHAR_AT: t,
      /* @ */
      CHAR_BACKWARD_SLASH: s,
      /* \ */
      CHAR_COMMA: i,
      /* , */
      CHAR_DOT: n,
      /* . */
      CHAR_EXCLAMATION_MARK: o,
      /* ! */
      CHAR_FORWARD_SLASH: a,
      /* / */
      CHAR_LEFT_CURLY_BRACE: l,
      /* { */
      CHAR_LEFT_PARENTHESES: p,
      /* ( */
      CHAR_LEFT_SQUARE_BRACKET: c,
      /* [ */
      CHAR_PLUS: f,
      /* + */
      CHAR_QUESTION_MARK: u,
      /* ? */
      CHAR_RIGHT_CURLY_BRACE: d,
      /* } */
      CHAR_RIGHT_PARENTHESES: m,
      /* ) */
      CHAR_RIGHT_SQUARE_BRACKET: x,
      /* ] */
    } = /* @__PURE__ */ Ze(),
    S = (D) => D === a || D === s,
    A = (D) => {
      D.isPrefix !== !0 && (D.depth = D.isGlobstar ? 1 / 0 : 1);
    };
  return (
    (or = (D, U) => {
      const M = U || {},
        Y = D.length - 1,
        T = M.parts === !0 || M.scanToEnd === !0,
        _ = [],
        R = [],
        q = [];
      let k = D,
        P = -1,
        F = 0,
        G = 0,
        w = !1,
        L = !1,
        I = !1,
        W = !1,
        N = !1,
        g = !1,
        X = !1,
        te = !1,
        Se = !1,
        h = !1,
        y = 0,
        xe,
        O,
        B = { value: '', depth: 0, isGlob: !1 };
      const fe = () => P >= Y,
        de = () => k.charCodeAt(P + 1),
        ne = () => ((xe = O), k.charCodeAt(++P));
      for (; P < Y; ) {
        O = ne();
        let ae;
        if (O === s) {
          (X = B.backslashes = !0), (O = ne()), O === l && (g = !0);
          continue;
        }
        if (g === !0 || O === l) {
          for (y++; fe() !== !0 && (O = ne()); ) {
            if (O === s) {
              (X = B.backslashes = !0), ne();
              continue;
            }
            if (O === l) {
              y++;
              continue;
            }
            if (g !== !0 && O === n && (O = ne()) === n) {
              if (((w = B.isBrace = !0), (I = B.isGlob = !0), (h = !0), T === !0)) continue;
              break;
            }
            if (g !== !0 && O === i) {
              if (((w = B.isBrace = !0), (I = B.isGlob = !0), (h = !0), T === !0)) continue;
              break;
            }
            if (O === d && (y--, y === 0)) {
              (g = !1), (w = B.isBrace = !0), (h = !0);
              break;
            }
          }
          if (T === !0) continue;
          break;
        }
        if (O === a) {
          if ((_.push(P), R.push(B), (B = { value: '', depth: 0, isGlob: !1 }), h === !0)) continue;
          if (xe === n && P === F + 1) {
            F += 2;
            continue;
          }
          G = P + 1;
          continue;
        }
        if (
          M.noext !== !0 &&
          (O === f || O === t || O === r || O === u || O === o) === !0 &&
          de() === p
        ) {
          if (
            ((I = B.isGlob = !0),
            (W = B.isExtglob = !0),
            (h = !0),
            O === o && P === F && (Se = !0),
            T === !0)
          ) {
            for (; fe() !== !0 && (O = ne()); ) {
              if (O === s) {
                (X = B.backslashes = !0), (O = ne());
                continue;
              }
              if (O === m) {
                (I = B.isGlob = !0), (h = !0);
                break;
              }
            }
            continue;
          }
          break;
        }
        if (O === r) {
          if ((xe === r && (N = B.isGlobstar = !0), (I = B.isGlob = !0), (h = !0), T === !0))
            continue;
          break;
        }
        if (O === u) {
          if (((I = B.isGlob = !0), (h = !0), T === !0)) continue;
          break;
        }
        if (O === c) {
          for (; fe() !== !0 && (ae = ne()); ) {
            if (ae === s) {
              (X = B.backslashes = !0), ne();
              continue;
            }
            if (ae === x) {
              (L = B.isBracket = !0), (I = B.isGlob = !0), (h = !0);
              break;
            }
          }
          if (T === !0) continue;
          break;
        }
        if (M.nonegate !== !0 && O === o && P === F) {
          (te = B.negated = !0), F++;
          continue;
        }
        if (M.noparen !== !0 && O === p) {
          if (((I = B.isGlob = !0), T === !0)) {
            for (; fe() !== !0 && (O = ne()); ) {
              if (O === p) {
                (X = B.backslashes = !0), (O = ne());
                continue;
              }
              if (O === m) {
                h = !0;
                break;
              }
            }
            continue;
          }
          break;
        }
        if (I === !0) {
          if (((h = !0), T === !0)) continue;
          break;
        }
      }
      M.noext === !0 && ((W = !1), (I = !1));
      let re = k,
        ve = '',
        ue = '';
      F > 0 && ((ve = k.slice(0, F)), (k = k.slice(F)), (G -= F)),
        re && I === !0 && G > 0
          ? ((re = k.slice(0, G)), (ue = k.slice(G)))
          : I === !0
          ? ((re = ''), (ue = k))
          : (re = k),
        re &&
          re !== '' &&
          re !== '/' &&
          re !== k &&
          S(re.charCodeAt(re.length - 1)) &&
          (re = re.slice(0, -1)),
        M.unescape === !0 &&
          (ue && (ue = e.removeBackslashes(ue)), re && X === !0 && (re = e.removeBackslashes(re)));
      const $ = {
        prefix: ve,
        input: D,
        start: F,
        base: re,
        glob: ue,
        isBrace: w,
        isBracket: L,
        isGlob: I,
        isExtglob: W,
        isGlobstar: N,
        negated: te,
        negatedExtglob: Se,
      };
      if (
        (M.tokens === !0 && (($.maxDepth = 0), S(O) || R.push(B), ($.tokens = R)),
        M.parts === !0 || M.tokens === !0)
      ) {
        let ae;
        for (let ie = 0; ie < _.length; ie++) {
          const E = ae ? ae + 1 : F,
            j = _[ie],
            b = D.slice(E, j);
          M.tokens &&
            (ie === 0 && F !== 0 ? ((R[ie].isPrefix = !0), (R[ie].value = ve)) : (R[ie].value = b),
            A(R[ie]),
            ($.maxDepth += R[ie].depth)),
            (ie !== 0 || b !== '') && q.push(b),
            (ae = j);
        }
        if (ae && ae + 1 < D.length) {
          const ie = D.slice(ae + 1);
          q.push(ie),
            M.tokens &&
              ((R[R.length - 1].value = ie),
              A(R[R.length - 1]),
              ($.maxDepth += R[R.length - 1].depth));
        }
        ($.slashes = _), ($.parts = q);
      }
      return $;
    }),
    or
  );
}
var sr, Ir;
function en() {
  if (Ir) return sr;
  Ir = 1;
  const e = /* @__PURE__ */ Ze(),
    r = /* @__PURE__ */ Je(),
    {
      MAX_LENGTH: t,
      POSIX_REGEX_SOURCE: s,
      REGEX_NON_SPECIAL_CHARS: i,
      REGEX_SPECIAL_CHARS_BACKREF: n,
      REPLACEMENTS: o,
    } = e,
    a = (c, f) => {
      if (typeof f.expandRange == 'function') return f.expandRange(...c, f);
      c.sort();
      const u = `[${c.join('-')}]`;
      try {
        new RegExp(u);
      } catch {
        return c.map((m) => r.escapeRegex(m)).join('..');
      }
      return u;
    },
    l = (c, f) => `Missing ${c}: "${f}" - use "\\\\${f}" to match literal characters`,
    p = (c, f) => {
      if (typeof c != 'string') throw new TypeError('Expected a string');
      c = o[c] || c;
      const u = { ...f },
        d = typeof u.maxLength == 'number' ? Math.min(t, u.maxLength) : t;
      let m = c.length;
      if (m > d) throw new SyntaxError(`Input length: ${m}, exceeds maximum allowed length: ${d}`);
      const x = { type: 'bos', value: '', output: u.prepend || '' },
        S = [x],
        A = u.capture ? '' : '?:',
        v = e.globChars(u.windows),
        D = e.extglobChars(v),
        {
          DOT_LITERAL: U,
          PLUS_LITERAL: M,
          SLASH_LITERAL: Y,
          ONE_CHAR: T,
          DOTS_SLASH: _,
          NO_DOT: R,
          NO_DOT_SLASH: q,
          NO_DOTS_SLASH: k,
          QMARK: P,
          QMARK_NO_DOT: F,
          STAR: G,
          START_ANCHOR: w,
        } = v,
        L = (E) => `(${A}(?:(?!${w}${E.dot ? _ : U}).)*?)`,
        I = u.dot ? '' : R,
        W = u.dot ? P : F;
      let N = u.bash === !0 ? L(u) : G;
      u.capture && (N = `(${N})`), typeof u.noext == 'boolean' && (u.noextglob = u.noext);
      const g = {
        input: c,
        index: -1,
        start: 0,
        dot: u.dot === !0,
        consumed: '',
        output: '',
        prefix: '',
        backtrack: !1,
        negated: !1,
        brackets: 0,
        braces: 0,
        parens: 0,
        quotes: 0,
        globstar: !1,
        tokens: S,
      };
      (c = r.removePrefix(c, g)), (m = c.length);
      const X = [],
        te = [],
        Se = [];
      let h = x,
        y;
      const xe = () => g.index === m - 1,
        O = (g.peek = (E = 1) => c[g.index + E]),
        B = (g.advance = () => c[++g.index] || ''),
        fe = () => c.slice(g.index + 1),
        de = (E = '', j = 0) => {
          (g.consumed += E), (g.index += j);
        },
        ne = (E) => {
          (g.output += E.output != null ? E.output : E.value), de(E.value);
        },
        re = () => {
          let E = 1;
          for (; O() === '!' && (O(2) !== '(' || O(3) === '?'); ) B(), g.start++, E++;
          return E % 2 === 0 ? !1 : ((g.negated = !0), g.start++, !0);
        },
        ve = (E) => {
          g[E]++, Se.push(E);
        },
        ue = (E) => {
          g[E]--, Se.pop();
        },
        $ = (E) => {
          if (h.type === 'globstar') {
            const j = g.braces > 0 && (E.type === 'comma' || E.type === 'brace'),
              b = E.extglob === !0 || (X.length && (E.type === 'pipe' || E.type === 'paren'));
            E.type !== 'slash' &&
              E.type !== 'paren' &&
              !j &&
              !b &&
              ((g.output = g.output.slice(0, -h.output.length)),
              (h.type = 'star'),
              (h.value = '*'),
              (h.output = N),
              (g.output += h.output));
          }
          if (
            (X.length && E.type !== 'paren' && (X[X.length - 1].inner += E.value),
            (E.value || E.output) && ne(E),
            h && h.type === 'text' && E.type === 'text')
          ) {
            (h.output = (h.output || h.value) + E.value), (h.value += E.value);
            return;
          }
          (E.prev = h), S.push(E), (h = E);
        },
        ae = (E, j) => {
          const b = { ...D[j], conditions: 1, inner: '' };
          (b.prev = h), (b.parens = g.parens), (b.output = g.output);
          const H = (u.capture ? '(' : '') + b.open;
          ve('parens'),
            $({ type: E, value: j, output: g.output ? '' : T }),
            $({ type: 'paren', extglob: !0, value: B(), output: H }),
            X.push(b);
        },
        ie = (E) => {
          let j = E.close + (u.capture ? ')' : ''),
            b;
          if (E.type === 'negate') {
            let H = N;
            if (
              (E.inner && E.inner.length > 1 && E.inner.includes('/') && (H = L(u)),
              (H !== N || xe() || /^\)+$/.test(fe())) && (j = E.close = `)$))${H}`),
              E.inner.includes('*') && (b = fe()) && /^\.[^\\/.]+$/.test(b))
            ) {
              const V = p(b, { ...f, fastpaths: !1 }).output;
              j = E.close = `)${V})${H})`;
            }
            E.prev.type === 'bos' && (g.negatedExtglob = !0);
          }
          $({ type: 'paren', extglob: !0, value: y, output: j }), ue('parens');
        };
      if (u.fastpaths !== !1 && !/(^[*!]|[/()[\]{}"])/.test(c)) {
        let E = !1,
          j = c.replace(n, (b, H, V, le, J, rr) =>
            le === '\\'
              ? ((E = !0), b)
              : le === '?'
              ? H
                ? H + le + (J ? P.repeat(J.length) : '')
                : rr === 0
                ? W + (J ? P.repeat(J.length) : '')
                : P.repeat(V.length)
              : le === '.'
              ? U.repeat(V.length)
              : le === '*'
              ? H
                ? H + le + (J ? N : '')
                : N
              : H
              ? b
              : `\\${b}`
          );
        return (
          E === !0 &&
            (u.unescape === !0
              ? (j = j.replace(/\\/g, ''))
              : (j = j.replace(/\\+/g, (b) => (b.length % 2 === 0 ? '\\\\' : b ? '\\' : '')))),
          j === c && u.contains === !0
            ? ((g.output = c), g)
            : ((g.output = r.wrapOutput(j, g, f)), g)
        );
      }
      for (; !xe(); ) {
        if (((y = B()), y === '\0')) continue;
        if (y === '\\') {
          const b = O();
          if ((b === '/' && u.bash !== !0) || b === '.' || b === ';') continue;
          if (!b) {
            (y += '\\'), $({ type: 'text', value: y });
            continue;
          }
          const H = /^\\+/.exec(fe());
          let V = 0;
          if (
            (H &&
              H[0].length > 2 &&
              ((V = H[0].length), (g.index += V), V % 2 !== 0 && (y += '\\')),
            u.unescape === !0 ? (y = B()) : (y += B()),
            g.brackets === 0)
          ) {
            $({ type: 'text', value: y });
            continue;
          }
        }
        if (g.brackets > 0 && (y !== ']' || h.value === '[' || h.value === '[^')) {
          if (u.posix !== !1 && y === ':') {
            const b = h.value.slice(1);
            if (b.includes('[') && ((h.posix = !0), b.includes(':'))) {
              const H = h.value.lastIndexOf('['),
                V = h.value.slice(0, H),
                le = h.value.slice(H + 2),
                J = s[le];
              if (J) {
                (h.value = V + J),
                  (g.backtrack = !0),
                  B(),
                  !x.output && S.indexOf(h) === 1 && (x.output = T);
                continue;
              }
            }
          }
          ((y === '[' && O() !== ':') || (y === '-' && O() === ']')) && (y = `\\${y}`),
            y === ']' && (h.value === '[' || h.value === '[^') && (y = `\\${y}`),
            u.posix === !0 && y === '!' && h.value === '[' && (y = '^'),
            (h.value += y),
            ne({ value: y });
          continue;
        }
        if (g.quotes === 1 && y !== '"') {
          (y = r.escapeRegex(y)), (h.value += y), ne({ value: y });
          continue;
        }
        if (y === '"') {
          (g.quotes = g.quotes === 1 ? 0 : 1), u.keepQuotes === !0 && $({ type: 'text', value: y });
          continue;
        }
        if (y === '(') {
          ve('parens'), $({ type: 'paren', value: y });
          continue;
        }
        if (y === ')') {
          if (g.parens === 0 && u.strictBrackets === !0) throw new SyntaxError(l('opening', '('));
          const b = X[X.length - 1];
          if (b && g.parens === b.parens + 1) {
            ie(X.pop());
            continue;
          }
          $({ type: 'paren', value: y, output: g.parens ? ')' : '\\)' }), ue('parens');
          continue;
        }
        if (y === '[') {
          if (u.nobracket === !0 || !fe().includes(']')) {
            if (u.nobracket !== !0 && u.strictBrackets === !0)
              throw new SyntaxError(l('closing', ']'));
            y = `\\${y}`;
          } else ve('brackets');
          $({ type: 'bracket', value: y });
          continue;
        }
        if (y === ']') {
          if (u.nobracket === !0 || (h && h.type === 'bracket' && h.value.length === 1)) {
            $({ type: 'text', value: y, output: `\\${y}` });
            continue;
          }
          if (g.brackets === 0) {
            if (u.strictBrackets === !0) throw new SyntaxError(l('opening', '['));
            $({ type: 'text', value: y, output: `\\${y}` });
            continue;
          }
          ue('brackets');
          const b = h.value.slice(1);
          if (
            (h.posix !== !0 && b[0] === '^' && !b.includes('/') && (y = `/${y}`),
            (h.value += y),
            ne({ value: y }),
            u.literalBrackets === !1 || r.hasRegexChars(b))
          )
            continue;
          const H = r.escapeRegex(h.value);
          if (((g.output = g.output.slice(0, -h.value.length)), u.literalBrackets === !0)) {
            (g.output += H), (h.value = H);
            continue;
          }
          (h.value = `(${A}${H}|${h.value})`), (g.output += h.value);
          continue;
        }
        if (y === '{' && u.nobrace !== !0) {
          ve('braces');
          const b = {
            type: 'brace',
            value: y,
            output: '(',
            outputIndex: g.output.length,
            tokensIndex: g.tokens.length,
          };
          te.push(b), $(b);
          continue;
        }
        if (y === '}') {
          const b = te[te.length - 1];
          if (u.nobrace === !0 || !b) {
            $({ type: 'text', value: y, output: y });
            continue;
          }
          let H = ')';
          if (b.dots === !0) {
            const V = S.slice(),
              le = [];
            for (let J = V.length - 1; J >= 0 && (S.pop(), V[J].type !== 'brace'); J--)
              V[J].type !== 'dots' && le.unshift(V[J].value);
            (H = a(le, u)), (g.backtrack = !0);
          }
          if (b.comma !== !0 && b.dots !== !0) {
            const V = g.output.slice(0, b.outputIndex),
              le = g.tokens.slice(b.tokensIndex);
            (b.value = b.output = '\\{'), (y = H = '\\}'), (g.output = V);
            for (const J of le) g.output += J.output || J.value;
          }
          $({ type: 'brace', value: y, output: H }), ue('braces'), te.pop();
          continue;
        }
        if (y === '|') {
          X.length > 0 && X[X.length - 1].conditions++, $({ type: 'text', value: y });
          continue;
        }
        if (y === ',') {
          let b = y;
          const H = te[te.length - 1];
          H && Se[Se.length - 1] === 'braces' && ((H.comma = !0), (b = '|')),
            $({ type: 'comma', value: y, output: b });
          continue;
        }
        if (y === '/') {
          if (h.type === 'dot' && g.index === g.start + 1) {
            (g.start = g.index + 1), (g.consumed = ''), (g.output = ''), S.pop(), (h = x);
            continue;
          }
          $({ type: 'slash', value: y, output: Y });
          continue;
        }
        if (y === '.') {
          if (g.braces > 0 && h.type === 'dot') {
            h.value === '.' && (h.output = U);
            const b = te[te.length - 1];
            (h.type = 'dots'), (h.output += y), (h.value += y), (b.dots = !0);
            continue;
          }
          if (g.braces + g.parens === 0 && h.type !== 'bos' && h.type !== 'slash') {
            $({ type: 'text', value: y, output: U });
            continue;
          }
          $({ type: 'dot', value: y, output: U });
          continue;
        }
        if (y === '?') {
          if (!(h && h.value === '(') && u.noextglob !== !0 && O() === '(' && O(2) !== '?') {
            ae('qmark', y);
            continue;
          }
          if (h && h.type === 'paren') {
            const H = O();
            let V = y;
            ((h.value === '(' && !/[!=<:]/.test(H)) || (H === '<' && !/<([!=]|\w+>)/.test(fe()))) &&
              (V = `\\${y}`),
              $({ type: 'text', value: y, output: V });
            continue;
          }
          if (u.dot !== !0 && (h.type === 'slash' || h.type === 'bos')) {
            $({ type: 'qmark', value: y, output: F });
            continue;
          }
          $({ type: 'qmark', value: y, output: P });
          continue;
        }
        if (y === '!') {
          if (u.noextglob !== !0 && O() === '(' && (O(2) !== '?' || !/[!=<:]/.test(O(3)))) {
            ae('negate', y);
            continue;
          }
          if (u.nonegate !== !0 && g.index === 0) {
            re();
            continue;
          }
        }
        if (y === '+') {
          if (u.noextglob !== !0 && O() === '(' && O(2) !== '?') {
            ae('plus', y);
            continue;
          }
          if ((h && h.value === '(') || u.regex === !1) {
            $({ type: 'plus', value: y, output: M });
            continue;
          }
          if (
            (h && (h.type === 'bracket' || h.type === 'paren' || h.type === 'brace')) ||
            g.parens > 0
          ) {
            $({ type: 'plus', value: y });
            continue;
          }
          $({ type: 'plus', value: M });
          continue;
        }
        if (y === '@') {
          if (u.noextglob !== !0 && O() === '(' && O(2) !== '?') {
            $({ type: 'at', extglob: !0, value: y, output: '' });
            continue;
          }
          $({ type: 'text', value: y });
          continue;
        }
        if (y !== '*') {
          (y === '$' || y === '^') && (y = `\\${y}`);
          const b = i.exec(fe());
          b && ((y += b[0]), (g.index += b[0].length)), $({ type: 'text', value: y });
          continue;
        }
        if (h && (h.type === 'globstar' || h.star === !0)) {
          (h.type = 'star'),
            (h.star = !0),
            (h.value += y),
            (h.output = N),
            (g.backtrack = !0),
            (g.globstar = !0),
            de(y);
          continue;
        }
        let E = fe();
        if (u.noextglob !== !0 && /^\([^?]/.test(E)) {
          ae('star', y);
          continue;
        }
        if (h.type === 'star') {
          if (u.noglobstar === !0) {
            de(y);
            continue;
          }
          const b = h.prev,
            H = b.prev,
            V = b.type === 'slash' || b.type === 'bos',
            le = H && (H.type === 'star' || H.type === 'globstar');
          if (u.bash === !0 && (!V || (E[0] && E[0] !== '/'))) {
            $({ type: 'star', value: y, output: '' });
            continue;
          }
          const J = g.braces > 0 && (b.type === 'comma' || b.type === 'brace'),
            rr = X.length && (b.type === 'pipe' || b.type === 'paren');
          if (!V && b.type !== 'paren' && !J && !rr) {
            $({ type: 'star', value: y, output: '' });
            continue;
          }
          for (; E.slice(0, 3) === '/**'; ) {
            const je = c[g.index + 4];
            if (je && je !== '/') break;
            (E = E.slice(3)), de('/**', 3);
          }
          if (b.type === 'bos' && xe()) {
            (h.type = 'globstar'),
              (h.value += y),
              (h.output = L(u)),
              (g.output = h.output),
              (g.globstar = !0),
              de(y);
            continue;
          }
          if (b.type === 'slash' && b.prev.type !== 'bos' && !le && xe()) {
            (g.output = g.output.slice(0, -(b.output + h.output).length)),
              (b.output = `(?:${b.output}`),
              (h.type = 'globstar'),
              (h.output = L(u) + (u.strictSlashes ? ')' : '|$)')),
              (h.value += y),
              (g.globstar = !0),
              (g.output += b.output + h.output),
              de(y);
            continue;
          }
          if (b.type === 'slash' && b.prev.type !== 'bos' && E[0] === '/') {
            const je = E[1] !== void 0 ? '|$' : '';
            (g.output = g.output.slice(0, -(b.output + h.output).length)),
              (b.output = `(?:${b.output}`),
              (h.type = 'globstar'),
              (h.output = `${L(u)}${Y}|${Y}${je})`),
              (h.value += y),
              (g.output += b.output + h.output),
              (g.globstar = !0),
              de(y + B()),
              $({ type: 'slash', value: '/', output: '' });
            continue;
          }
          if (b.type === 'bos' && E[0] === '/') {
            (h.type = 'globstar'),
              (h.value += y),
              (h.output = `(?:^|${Y}|${L(u)}${Y})`),
              (g.output = h.output),
              (g.globstar = !0),
              de(y + B()),
              $({ type: 'slash', value: '/', output: '' });
            continue;
          }
          (g.output = g.output.slice(0, -h.output.length)),
            (h.type = 'globstar'),
            (h.output = L(u)),
            (h.value += y),
            (g.output += h.output),
            (g.globstar = !0),
            de(y);
          continue;
        }
        const j = { type: 'star', value: y, output: N };
        if (u.bash === !0) {
          (j.output = '.*?'),
            (h.type === 'bos' || h.type === 'slash') && (j.output = I + j.output),
            $(j);
          continue;
        }
        if (h && (h.type === 'bracket' || h.type === 'paren') && u.regex === !0) {
          (j.output = y), $(j);
          continue;
        }
        (g.index === g.start || h.type === 'slash' || h.type === 'dot') &&
          (h.type === 'dot'
            ? ((g.output += q), (h.output += q))
            : u.dot === !0
            ? ((g.output += k), (h.output += k))
            : ((g.output += I), (h.output += I)),
          O() !== '*' && ((g.output += T), (h.output += T))),
          $(j);
      }
      for (; g.brackets > 0; ) {
        if (u.strictBrackets === !0) throw new SyntaxError(l('closing', ']'));
        (g.output = r.escapeLast(g.output, '[')), ue('brackets');
      }
      for (; g.parens > 0; ) {
        if (u.strictBrackets === !0) throw new SyntaxError(l('closing', ')'));
        (g.output = r.escapeLast(g.output, '(')), ue('parens');
      }
      for (; g.braces > 0; ) {
        if (u.strictBrackets === !0) throw new SyntaxError(l('closing', '}'));
        (g.output = r.escapeLast(g.output, '{')), ue('braces');
      }
      if (
        (u.strictSlashes !== !0 &&
          (h.type === 'star' || h.type === 'bracket') &&
          $({ type: 'maybe_slash', value: '', output: `${Y}?` }),
        g.backtrack === !0)
      ) {
        g.output = '';
        for (const E of g.tokens)
          (g.output += E.output != null ? E.output : E.value), E.suffix && (g.output += E.suffix);
      }
      return g;
    };
  return (
    (p.fastpaths = (c, f) => {
      const u = { ...f },
        d = typeof u.maxLength == 'number' ? Math.min(t, u.maxLength) : t,
        m = c.length;
      if (m > d) throw new SyntaxError(`Input length: ${m}, exceeds maximum allowed length: ${d}`);
      c = o[c] || c;
      const {
          DOT_LITERAL: x,
          SLASH_LITERAL: S,
          ONE_CHAR: A,
          DOTS_SLASH: v,
          NO_DOT: D,
          NO_DOTS: U,
          NO_DOTS_SLASH: M,
          STAR: Y,
          START_ANCHOR: T,
        } = e.globChars(u.windows),
        _ = u.dot ? U : D,
        R = u.dot ? M : D,
        q = u.capture ? '' : '?:',
        k = { negated: !1, prefix: '' };
      let P = u.bash === !0 ? '.*?' : Y;
      u.capture && (P = `(${P})`);
      const F = (I) => (I.noglobstar === !0 ? P : `(${q}(?:(?!${T}${I.dot ? v : x}).)*?)`),
        G = (I) => {
          switch (I) {
            case '*':
              return `${_}${A}${P}`;
            case '.*':
              return `${x}${A}${P}`;
            case '*.*':
              return `${_}${P}${x}${A}${P}`;
            case '*/*':
              return `${_}${P}${S}${A}${R}${P}`;
            case '**':
              return _ + F(u);
            case '**/*':
              return `(?:${_}${F(u)}${S})?${R}${A}${P}`;
            case '**/*.*':
              return `(?:${_}${F(u)}${S})?${R}${P}${x}${A}${P}`;
            case '**/.*':
              return `(?:${_}${F(u)}${S})?${x}${A}${P}`;
            default: {
              const W = /^(.*?)\.(\w+)$/.exec(I);
              if (!W) return;
              const N = G(W[1]);
              return N ? N + x + W[2] : void 0;
            }
          }
        },
        w = r.removePrefix(c, k);
      let L = G(w);
      return L && u.strictSlashes !== !0 && (L += `${S}?`), L;
    }),
    (sr = p),
    sr
  );
}
var ar, $r;
function rn() {
  if ($r) return ar;
  $r = 1;
  const e = /* @__PURE__ */ Jt(),
    r = /* @__PURE__ */ en(),
    t = /* @__PURE__ */ Je(),
    s = /* @__PURE__ */ Ze(),
    i = (o) => o && typeof o == 'object' && !Array.isArray(o),
    n = (o, a, l = !1) => {
      if (Array.isArray(o)) {
        const S = o.map((v) => n(v, a, l));
        return (v) => {
          for (const D of S) {
            const U = D(v);
            if (U) return U;
          }
          return !1;
        };
      }
      const p = i(o) && o.tokens && o.input;
      if (o === '' || (typeof o != 'string' && !p))
        throw new TypeError('Expected pattern to be a non-empty string');
      const c = a || {},
        f = c.windows,
        u = p ? n.compileRe(o, a) : n.makeRe(o, a, !1, !0),
        d = u.state;
      delete u.state;
      let m = () => !1;
      if (c.ignore) {
        const S = { ...a, ignore: null, onMatch: null, onResult: null };
        m = n(c.ignore, S, l);
      }
      const x = (S, A = !1) => {
        const { isMatch: v, match: D, output: U } = n.test(S, u, a, { glob: o, posix: f }),
          M = { glob: o, state: d, regex: u, posix: f, input: S, output: U, match: D, isMatch: v };
        return (
          typeof c.onResult == 'function' && c.onResult(M),
          v === !1
            ? ((M.isMatch = !1), A ? M : !1)
            : m(S)
            ? (typeof c.onIgnore == 'function' && c.onIgnore(M), (M.isMatch = !1), A ? M : !1)
            : (typeof c.onMatch == 'function' && c.onMatch(M), A ? M : !0)
        );
      };
      return l && (x.state = d), x;
    };
  return (
    (n.test = (o, a, l, { glob: p, posix: c } = {}) => {
      if (typeof o != 'string') throw new TypeError('Expected input to be a string');
      if (o === '') return { isMatch: !1, output: '' };
      const f = l || {},
        u = f.format || (c ? t.toPosixSlashes : null);
      let d = o === p,
        m = d && u ? u(o) : o;
      return (
        d === !1 && ((m = u ? u(o) : o), (d = m === p)),
        (d === !1 || f.capture === !0) &&
          (f.matchBase === !0 || f.basename === !0
            ? (d = n.matchBase(o, a, l, c))
            : (d = a.exec(m))),
        { isMatch: !!d, match: d, output: m }
      );
    }),
    (n.matchBase = (o, a, l) => (a instanceof RegExp ? a : n.makeRe(a, l)).test(t.basename(o))),
    (n.isMatch = (o, a, l) => n(a, l)(o)),
    (n.parse = (o, a) =>
      Array.isArray(o) ? o.map((l) => n.parse(l, a)) : r(o, { ...a, fastpaths: !1 })),
    (n.scan = (o, a) => e(o, a)),
    (n.compileRe = (o, a, l = !1, p = !1) => {
      if (l === !0) return o.output;
      const c = a || {},
        f = c.contains ? '' : '^',
        u = c.contains ? '' : '$';
      let d = `${f}(?:${o.output})${u}`;
      o && o.negated === !0 && (d = `^(?!${d}).*$`);
      const m = n.toRegex(d, a);
      return p === !0 && (m.state = o), m;
    }),
    (n.makeRe = (o, a = {}, l = !1, p = !1) => {
      if (!o || typeof o != 'string') throw new TypeError('Expected a non-empty string');
      let c = { negated: !1, fastpaths: !0 };
      return (
        a.fastpaths !== !1 && (o[0] === '.' || o[0] === '*') && (c.output = r.fastpaths(o, a)),
        c.output || (c = r(o, a)),
        n.compileRe(c, a, l, p)
      );
    }),
    (n.toRegex = (o, a) => {
      try {
        const l = a || {};
        return new RegExp(o, l.flags || (l.nocase ? 'i' : ''));
      } catch (l) {
        if (a && a.debug === !0) throw l;
        return /$^/;
      }
    }),
    (n.constants = s),
    (ar = n),
    ar
  );
}
var lr, Nr;
function tn() {
  if (Nr) return lr;
  Nr = 1;
  const e = /* @__PURE__ */ rn(),
    r = /* @__PURE__ */ Je();
  function t(s, i, n = !1) {
    return (
      i && (i.windows === null || i.windows === void 0) && (i = { ...i, windows: r.isWindows() }),
      e(s, i, n)
    );
  }
  return Object.assign(t, e), (lr = t), lr;
}
var nn = /* @__PURE__ */ tn();
const ft = typeof window < 'u' || typeof process > 'u' || process?.platform === 'browser',
  on = ft ? {} : process.env || {};
async function sn(e, r) {
  const t = {};
  for (const i of r.headers)
    an(e, i.matches) && (t[i.name] = i.envVariable !== void 0 ? on[i.envVariable] || '' : i.value);
  const s = await (r.customFetch || fetch)(e, {
    headers: t,
  });
  if (!s.ok) throw new Error(`Failed to load ${e}: ${s.status} ${s.statusText}`);
  return { body: await s.text(), mimeType: s.headers.get('content-type') };
}
function an(e, r) {
  return r.match(/^https?:\/\//) || (e = e.replace(/^https?:\/\//, '')), nn.isMatch(e, r);
}
/*! js-yaml 4.1.0 https://github.com/nodeca/js-yaml @license MIT */
function dt(e) {
  return typeof e > 'u' || e === null;
}
function ln(e) {
  return typeof e == 'object' && e !== null;
}
function un(e) {
  return Array.isArray(e) ? e : dt(e) ? [] : [e];
}
function cn(e, r) {
  var t, s, i, n;
  if (r) for (n = Object.keys(r), t = 0, s = n.length; t < s; t += 1) (i = n[t]), (e[i] = r[i]);
  return e;
}
function pn(e, r) {
  var t = '',
    s;
  for (s = 0; s < r; s += 1) t += e;
  return t;
}
function fn(e) {
  return e === 0 && Number.NEGATIVE_INFINITY === 1 / e;
}
var dn = dt,
  mn = ln,
  hn = un,
  yn = pn,
  gn = fn,
  xn = cn,
  ee = {
    isNothing: dn,
    isObject: mn,
    toArray: hn,
    repeat: yn,
    isNegativeZero: gn,
    extend: xn,
  };
function mt(e, r) {
  var t = '',
    s = e.reason || '(unknown reason)';
  return e.mark
    ? (e.mark.name && (t += 'in "' + e.mark.name + '" '),
      (t += '(' + (e.mark.line + 1) + ':' + (e.mark.column + 1) + ')'),
      !r &&
        e.mark.snippet &&
        (t +=
          `

` + e.mark.snippet),
      s + ' ' + t)
    : s;
}
function Fe(e, r) {
  Error.call(this),
    (this.name = 'YAMLException'),
    (this.reason = e),
    (this.mark = r),
    (this.message = mt(this, !1)),
    Error.captureStackTrace
      ? Error.captureStackTrace(this, this.constructor)
      : (this.stack = new Error().stack || '');
}
Fe.prototype = Object.create(Error.prototype);
Fe.prototype.constructor = Fe;
Fe.prototype.toString = function (r) {
  return this.name + ': ' + mt(this, r);
};
var ce = Fe;
function ur(e, r, t, s, i) {
  var n = '',
    o = '',
    a = Math.floor(i / 2) - 1;
  return (
    s - r > a && ((n = ' ... '), (r = s - a + n.length)),
    t - s > a && ((o = ' ...'), (t = s + a - o.length)),
    {
      str: n + e.slice(r, t).replace(/\t/g, '→') + o,
      pos: s - r + n.length,
      // relative position
    }
  );
}
function cr(e, r) {
  return ee.repeat(' ', r - e.length) + e;
}
function vn(e, r) {
  if (((r = Object.create(r || null)), !e.buffer)) return null;
  r.maxLength || (r.maxLength = 79),
    typeof r.indent != 'number' && (r.indent = 1),
    typeof r.linesBefore != 'number' && (r.linesBefore = 3),
    typeof r.linesAfter != 'number' && (r.linesAfter = 2);
  for (var t = /\r?\n|\r|\0/g, s = [0], i = [], n, o = -1; (n = t.exec(e.buffer)); )
    i.push(n.index),
      s.push(n.index + n[0].length),
      e.position <= n.index && o < 0 && (o = s.length - 2);
  o < 0 && (o = s.length - 1);
  var a = '',
    l,
    p,
    c = Math.min(e.line + r.linesAfter, i.length).toString().length,
    f = r.maxLength - (r.indent + c + 3);
  for (l = 1; l <= r.linesBefore && !(o - l < 0); l++)
    (p = ur(e.buffer, s[o - l], i[o - l], e.position - (s[o] - s[o - l]), f)),
      (a =
        ee.repeat(' ', r.indent) +
        cr((e.line - l + 1).toString(), c) +
        ' | ' +
        p.str +
        `
` +
        a);
  for (
    p = ur(e.buffer, s[o], i[o], e.position, f),
      a +=
        ee.repeat(' ', r.indent) +
        cr((e.line + 1).toString(), c) +
        ' | ' +
        p.str +
        `
`,
      a +=
        ee.repeat('-', r.indent + c + 3 + p.pos) +
        `^
`,
      l = 1;
    l <= r.linesAfter && !(o + l >= i.length);
    l++
  )
    (p = ur(e.buffer, s[o + l], i[o + l], e.position - (s[o] - s[o + l]), f)),
      (a +=
        ee.repeat(' ', r.indent) +
        cr((e.line + l + 1).toString(), c) +
        ' | ' +
        p.str +
        `
`);
  return a.replace(/\n$/, '');
}
var An = vn,
  bn = [
    'kind',
    'multi',
    'resolve',
    'construct',
    'instanceOf',
    'predicate',
    'represent',
    'representName',
    'defaultStyle',
    'styleAliases',
  ],
  Sn = ['scalar', 'sequence', 'mapping'];
function Rn(e) {
  var r = {};
  return (
    e !== null &&
      Object.keys(e).forEach(function (t) {
        e[t].forEach(function (s) {
          r[String(s)] = t;
        });
      }),
    r
  );
}
function En(e, r) {
  if (
    ((r = r || {}),
    Object.keys(r).forEach(function (t) {
      if (bn.indexOf(t) === -1)
        throw new ce('Unknown option "' + t + '" is met in definition of "' + e + '" YAML type.');
    }),
    (this.options = r),
    (this.tag = e),
    (this.kind = r.kind || null),
    (this.resolve =
      r.resolve ||
      function () {
        return !0;
      }),
    (this.construct =
      r.construct ||
      function (t) {
        return t;
      }),
    (this.instanceOf = r.instanceOf || null),
    (this.predicate = r.predicate || null),
    (this.represent = r.represent || null),
    (this.representName = r.representName || null),
    (this.defaultStyle = r.defaultStyle || null),
    (this.multi = r.multi || !1),
    (this.styleAliases = Rn(r.styleAliases || null)),
    Sn.indexOf(this.kind) === -1)
  )
    throw new ce('Unknown kind "' + this.kind + '" is specified for "' + e + '" YAML type.');
}
var oe = En;
function Dr(e, r) {
  var t = [];
  return (
    e[r].forEach(function (s) {
      var i = t.length;
      t.forEach(function (n, o) {
        n.tag === s.tag && n.kind === s.kind && n.multi === s.multi && (i = o);
      }),
        (t[i] = s);
    }),
    t
  );
}
function _n() {
  var e = {
      scalar: {},
      sequence: {},
      mapping: {},
      fallback: {},
      multi: {
        scalar: [],
        sequence: [],
        mapping: [],
        fallback: [],
      },
    },
    r,
    t;
  function s(i) {
    i.multi
      ? (e.multi[i.kind].push(i), e.multi.fallback.push(i))
      : (e[i.kind][i.tag] = e.fallback[i.tag] = i);
  }
  for (r = 0, t = arguments.length; r < t; r += 1) arguments[r].forEach(s);
  return e;
}
function hr(e) {
  return this.extend(e);
}
hr.prototype.extend = function (r) {
  var t = [],
    s = [];
  if (r instanceof oe) s.push(r);
  else if (Array.isArray(r)) s = s.concat(r);
  else if (r && (Array.isArray(r.implicit) || Array.isArray(r.explicit)))
    r.implicit && (t = t.concat(r.implicit)), r.explicit && (s = s.concat(r.explicit));
  else
    throw new ce(
      'Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })'
    );
  t.forEach(function (n) {
    if (!(n instanceof oe))
      throw new ce(
        'Specified list of YAML types (or a single Type object) contains a non-Type object.'
      );
    if (n.loadKind && n.loadKind !== 'scalar')
      throw new ce(
        'There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.'
      );
    if (n.multi)
      throw new ce(
        'There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.'
      );
  }),
    s.forEach(function (n) {
      if (!(n instanceof oe))
        throw new ce(
          'Specified list of YAML types (or a single Type object) contains a non-Type object.'
        );
    });
  var i = Object.create(hr.prototype);
  return (
    (i.implicit = (this.implicit || []).concat(t)),
    (i.explicit = (this.explicit || []).concat(s)),
    (i.compiledImplicit = Dr(i, 'implicit')),
    (i.compiledExplicit = Dr(i, 'explicit')),
    (i.compiledTypeMap = _n(i.compiledImplicit, i.compiledExplicit)),
    i
  );
};
var wn = hr,
  Cn = new oe('tag:yaml.org,2002:str', {
    kind: 'scalar',
    construct: function (e) {
      return e !== null ? e : '';
    },
  }),
  Pn = new oe('tag:yaml.org,2002:seq', {
    kind: 'sequence',
    construct: function (e) {
      return e !== null ? e : [];
    },
  }),
  On = new oe('tag:yaml.org,2002:map', {
    kind: 'mapping',
    construct: function (e) {
      return e !== null ? e : {};
    },
  }),
  Tn = new wn({
    explicit: [Cn, Pn, On],
  });
function Ln(e) {
  if (e === null) return !0;
  var r = e.length;
  return (r === 1 && e === '~') || (r === 4 && (e === 'null' || e === 'Null' || e === 'NULL'));
}
function kn() {
  return null;
}
function In(e) {
  return e === null;
}
var $n = new oe('tag:yaml.org,2002:null', {
  kind: 'scalar',
  resolve: Ln,
  construct: kn,
  predicate: In,
  represent: {
    canonical: function () {
      return '~';
    },
    lowercase: function () {
      return 'null';
    },
    uppercase: function () {
      return 'NULL';
    },
    camelcase: function () {
      return 'Null';
    },
    empty: function () {
      return '';
    },
  },
  defaultStyle: 'lowercase',
});
function Nn(e) {
  if (e === null) return !1;
  var r = e.length;
  return (
    (r === 4 && (e === 'true' || e === 'True' || e === 'TRUE')) ||
    (r === 5 && (e === 'false' || e === 'False' || e === 'FALSE'))
  );
}
function Dn(e) {
  return e === 'true' || e === 'True' || e === 'TRUE';
}
function Mn(e) {
  return Object.prototype.toString.call(e) === '[object Boolean]';
}
var Fn = new oe('tag:yaml.org,2002:bool', {
  kind: 'scalar',
  resolve: Nn,
  construct: Dn,
  predicate: Mn,
  represent: {
    lowercase: function (e) {
      return e ? 'true' : 'false';
    },
    uppercase: function (e) {
      return e ? 'TRUE' : 'FALSE';
    },
    camelcase: function (e) {
      return e ? 'True' : 'False';
    },
  },
  defaultStyle: 'lowercase',
});
function Hn(e) {
  return (48 <= e && e <= 57) || (65 <= e && e <= 70) || (97 <= e && e <= 102);
}
function Un(e) {
  return 48 <= e && e <= 55;
}
function qn(e) {
  return 48 <= e && e <= 57;
}
function Bn(e) {
  if (e === null) return !1;
  var r = e.length,
    t = 0,
    s = !1,
    i;
  if (!r) return !1;
  if (((i = e[t]), (i === '-' || i === '+') && (i = e[++t]), i === '0')) {
    if (t + 1 === r) return !0;
    if (((i = e[++t]), i === 'b')) {
      for (t++; t < r; t++)
        if (((i = e[t]), i !== '_')) {
          if (i !== '0' && i !== '1') return !1;
          s = !0;
        }
      return s && i !== '_';
    }
    if (i === 'x') {
      for (t++; t < r; t++)
        if (((i = e[t]), i !== '_')) {
          if (!Hn(e.charCodeAt(t))) return !1;
          s = !0;
        }
      return s && i !== '_';
    }
    if (i === 'o') {
      for (t++; t < r; t++)
        if (((i = e[t]), i !== '_')) {
          if (!Un(e.charCodeAt(t))) return !1;
          s = !0;
        }
      return s && i !== '_';
    }
  }
  if (i === '_') return !1;
  for (; t < r; t++)
    if (((i = e[t]), i !== '_')) {
      if (!qn(e.charCodeAt(t))) return !1;
      s = !0;
    }
  return !(!s || i === '_');
}
function jn(e) {
  var r = e,
    t = 1,
    s;
  if (
    (r.indexOf('_') !== -1 && (r = r.replace(/_/g, '')),
    (s = r[0]),
    (s === '-' || s === '+') && (s === '-' && (t = -1), (r = r.slice(1)), (s = r[0])),
    r === '0')
  )
    return 0;
  if (s === '0') {
    if (r[1] === 'b') return t * parseInt(r.slice(2), 2);
    if (r[1] === 'x') return t * parseInt(r.slice(2), 16);
    if (r[1] === 'o') return t * parseInt(r.slice(2), 8);
  }
  return t * parseInt(r, 10);
}
function zn(e) {
  return (
    Object.prototype.toString.call(e) === '[object Number]' && e % 1 === 0 && !ee.isNegativeZero(e)
  );
}
var Gn = new oe('tag:yaml.org,2002:int', {
    kind: 'scalar',
    resolve: Bn,
    construct: jn,
    predicate: zn,
    represent: {
      binary: function (e) {
        return e >= 0 ? '0b' + e.toString(2) : '-0b' + e.toString(2).slice(1);
      },
      octal: function (e) {
        return e >= 0 ? '0o' + e.toString(8) : '-0o' + e.toString(8).slice(1);
      },
      decimal: function (e) {
        return e.toString(10);
      },
      /* eslint-disable max-len */
      hexadecimal: function (e) {
        return e >= 0
          ? '0x' + e.toString(16).toUpperCase()
          : '-0x' + e.toString(16).toUpperCase().slice(1);
      },
    },
    defaultStyle: 'decimal',
    styleAliases: {
      binary: [2, 'bin'],
      octal: [8, 'oct'],
      decimal: [10, 'dec'],
      hexadecimal: [16, 'hex'],
    },
  }),
  Vn = new RegExp(
    // 2.5e4, 2.5 and integers
    '^(?:[-+]?(?:[0-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$'
  );
function Kn(e) {
  return !(
    e === null ||
    !Vn.test(e) || // Quick hack to not allow integers end with `_`
    // Probably should update regexp & check speed
    e[e.length - 1] === '_'
  );
}
function Yn(e) {
  var r, t;
  return (
    (r = e.replace(/_/g, '').toLowerCase()),
    (t = r[0] === '-' ? -1 : 1),
    '+-'.indexOf(r[0]) >= 0 && (r = r.slice(1)),
    r === '.inf'
      ? t === 1
        ? Number.POSITIVE_INFINITY
        : Number.NEGATIVE_INFINITY
      : r === '.nan'
      ? NaN
      : t * parseFloat(r, 10)
  );
}
var Wn = /^[-+]?[0-9]+e/;
function Xn(e, r) {
  var t;
  if (isNaN(e))
    switch (r) {
      case 'lowercase':
        return '.nan';
      case 'uppercase':
        return '.NAN';
      case 'camelcase':
        return '.NaN';
    }
  else if (Number.POSITIVE_INFINITY === e)
    switch (r) {
      case 'lowercase':
        return '.inf';
      case 'uppercase':
        return '.INF';
      case 'camelcase':
        return '.Inf';
    }
  else if (Number.NEGATIVE_INFINITY === e)
    switch (r) {
      case 'lowercase':
        return '-.inf';
      case 'uppercase':
        return '-.INF';
      case 'camelcase':
        return '-.Inf';
    }
  else if (ee.isNegativeZero(e)) return '-0.0';
  return (t = e.toString(10)), Wn.test(t) ? t.replace('e', '.e') : t;
}
function Qn(e) {
  return (
    Object.prototype.toString.call(e) === '[object Number]' && (e % 1 !== 0 || ee.isNegativeZero(e))
  );
}
var Zn = new oe('tag:yaml.org,2002:float', {
    kind: 'scalar',
    resolve: Kn,
    construct: Yn,
    predicate: Qn,
    represent: Xn,
    defaultStyle: 'lowercase',
  }),
  ht = Tn.extend({
    implicit: [$n, Fn, Gn, Zn],
  }),
  Jn = ht,
  yt = new RegExp('^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$'),
  gt = new RegExp(
    '^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$'
  );
function ei(e) {
  return e === null ? !1 : yt.exec(e) !== null || gt.exec(e) !== null;
}
function ri(e) {
  var r,
    t,
    s,
    i,
    n,
    o,
    a,
    l = 0,
    p = null,
    c,
    f,
    u;
  if (((r = yt.exec(e)), r === null && (r = gt.exec(e)), r === null))
    throw new Error('Date resolve error');
  if (((t = +r[1]), (s = +r[2] - 1), (i = +r[3]), !r[4])) return new Date(Date.UTC(t, s, i));
  if (((n = +r[4]), (o = +r[5]), (a = +r[6]), r[7])) {
    for (l = r[7].slice(0, 3); l.length < 3; ) l += '0';
    l = +l;
  }
  return (
    r[9] && ((c = +r[10]), (f = +(r[11] || 0)), (p = (c * 60 + f) * 6e4), r[9] === '-' && (p = -p)),
    (u = new Date(Date.UTC(t, s, i, n, o, a, l))),
    p && u.setTime(u.getTime() - p),
    u
  );
}
function ti(e) {
  return e.toISOString();
}
var ni = new oe('tag:yaml.org,2002:timestamp', {
  kind: 'scalar',
  resolve: ei,
  construct: ri,
  instanceOf: Date,
  represent: ti,
});
function ii(e) {
  return e === '<<' || e === null;
}
var xt = new oe('tag:yaml.org,2002:merge', {
    kind: 'scalar',
    resolve: ii,
  }),
  Sr = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=
\r`;
function oi(e) {
  if (e === null) return !1;
  var r,
    t,
    s = 0,
    i = e.length,
    n = Sr;
  for (t = 0; t < i; t++)
    if (((r = n.indexOf(e.charAt(t))), !(r > 64))) {
      if (r < 0) return !1;
      s += 6;
    }
  return s % 8 === 0;
}
function si(e) {
  var r,
    t,
    s = e.replace(/[\r\n=]/g, ''),
    i = s.length,
    n = Sr,
    o = 0,
    a = [];
  for (r = 0; r < i; r++)
    r % 4 === 0 && r && (a.push((o >> 16) & 255), a.push((o >> 8) & 255), a.push(o & 255)),
      (o = (o << 6) | n.indexOf(s.charAt(r)));
  return (
    (t = (i % 4) * 6),
    t === 0
      ? (a.push((o >> 16) & 255), a.push((o >> 8) & 255), a.push(o & 255))
      : t === 18
      ? (a.push((o >> 10) & 255), a.push((o >> 2) & 255))
      : t === 12 && a.push((o >> 4) & 255),
    new Uint8Array(a)
  );
}
function ai(e) {
  var r = '',
    t = 0,
    s,
    i,
    n = e.length,
    o = Sr;
  for (s = 0; s < n; s++)
    s % 3 === 0 &&
      s &&
      ((r += o[(t >> 18) & 63]),
      (r += o[(t >> 12) & 63]),
      (r += o[(t >> 6) & 63]),
      (r += o[t & 63])),
      (t = (t << 8) + e[s]);
  return (
    (i = n % 3),
    i === 0
      ? ((r += o[(t >> 18) & 63]),
        (r += o[(t >> 12) & 63]),
        (r += o[(t >> 6) & 63]),
        (r += o[t & 63]))
      : i === 2
      ? ((r += o[(t >> 10) & 63]), (r += o[(t >> 4) & 63]), (r += o[(t << 2) & 63]), (r += o[64]))
      : i === 1 && ((r += o[(t >> 2) & 63]), (r += o[(t << 4) & 63]), (r += o[64]), (r += o[64])),
    r
  );
}
function li(e) {
  return Object.prototype.toString.call(e) === '[object Uint8Array]';
}
var vt = new oe('tag:yaml.org,2002:binary', {
    kind: 'scalar',
    resolve: oi,
    construct: si,
    predicate: li,
    represent: ai,
  }),
  ui = Object.prototype.hasOwnProperty,
  ci = Object.prototype.toString;
function pi(e) {
  if (e === null) return !0;
  var r = [],
    t,
    s,
    i,
    n,
    o,
    a = e;
  for (t = 0, s = a.length; t < s; t += 1) {
    if (((i = a[t]), (o = !1), ci.call(i) !== '[object Object]')) return !1;
    for (n in i)
      if (ui.call(i, n))
        if (!o) o = !0;
        else return !1;
    if (!o) return !1;
    if (r.indexOf(n) === -1) r.push(n);
    else return !1;
  }
  return !0;
}
function fi(e) {
  return e !== null ? e : [];
}
var At = new oe('tag:yaml.org,2002:omap', {
    kind: 'sequence',
    resolve: pi,
    construct: fi,
  }),
  di = Object.prototype.toString;
function mi(e) {
  if (e === null) return !0;
  var r,
    t,
    s,
    i,
    n,
    o = e;
  for (n = new Array(o.length), r = 0, t = o.length; r < t; r += 1) {
    if (((s = o[r]), di.call(s) !== '[object Object]' || ((i = Object.keys(s)), i.length !== 1)))
      return !1;
    n[r] = [i[0], s[i[0]]];
  }
  return !0;
}
function hi(e) {
  if (e === null) return [];
  var r,
    t,
    s,
    i,
    n,
    o = e;
  for (n = new Array(o.length), r = 0, t = o.length; r < t; r += 1)
    (s = o[r]), (i = Object.keys(s)), (n[r] = [i[0], s[i[0]]]);
  return n;
}
var bt = new oe('tag:yaml.org,2002:pairs', {
    kind: 'sequence',
    resolve: mi,
    construct: hi,
  }),
  yi = Object.prototype.hasOwnProperty;
function gi(e) {
  if (e === null) return !0;
  var r,
    t = e;
  for (r in t) if (yi.call(t, r) && t[r] !== null) return !1;
  return !0;
}
function xi(e) {
  return e !== null ? e : {};
}
var St = new oe('tag:yaml.org,2002:set', {
    kind: 'mapping',
    resolve: gi,
    construct: xi,
  }),
  Rt = Jn.extend({
    implicit: [ni, xt],
    explicit: [vt, At, bt, St],
  }),
  be = Object.prototype.hasOwnProperty,
  Ve = 1,
  Et = 2,
  _t = 3,
  Ke = 4,
  pr = 1,
  vi = 2,
  Mr = 3,
  Ai =
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/,
  bi = /[\x85\u2028\u2029]/,
  Si = /[,\[\]\{\}]/,
  wt = /^(?:!|!!|![a-z\-]+!)$/i,
  Ct = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
function Fr(e) {
  return Object.prototype.toString.call(e);
}
function he(e) {
  return e === 10 || e === 13;
}
function Re(e) {
  return e === 9 || e === 32;
}
function pe(e) {
  return e === 9 || e === 32 || e === 10 || e === 13;
}
function Pe(e) {
  return e === 44 || e === 91 || e === 93 || e === 123 || e === 125;
}
function Ri(e) {
  var r;
  return 48 <= e && e <= 57 ? e - 48 : ((r = e | 32), 97 <= r && r <= 102 ? r - 97 + 10 : -1);
}
function Ei(e) {
  return e === 120 ? 2 : e === 117 ? 4 : e === 85 ? 8 : 0;
}
function _i(e) {
  return 48 <= e && e <= 57 ? e - 48 : -1;
}
function Hr(e) {
  return e === 48
    ? '\0'
    : e === 97
    ? '\x07'
    : e === 98
    ? '\b'
    : e === 116 || e === 9
    ? '	'
    : e === 110
    ? `
`
    : e === 118
    ? '\v'
    : e === 102
    ? '\f'
    : e === 114
    ? '\r'
    : e === 101
    ? '\x1B'
    : e === 32
    ? ' '
    : e === 34
    ? '"'
    : e === 47
    ? '/'
    : e === 92
    ? '\\'
    : e === 78
    ? ''
    : e === 95
    ? ' '
    : e === 76
    ? '\u2028'
    : e === 80
    ? '\u2029'
    : '';
}
function wi(e) {
  return e <= 65535
    ? String.fromCharCode(e)
    : String.fromCharCode(((e - 65536) >> 10) + 55296, ((e - 65536) & 1023) + 56320);
}
var Pt = new Array(256),
  Ot = new Array(256);
for (var _e = 0; _e < 256; _e++) (Pt[_e] = Hr(_e) ? 1 : 0), (Ot[_e] = Hr(_e));
function Ci(e, r) {
  (this.input = e),
    (this.filename = r.filename || null),
    (this.schema = r.schema || Rt),
    (this.onWarning = r.onWarning || null),
    (this.legacy = r.legacy || !1),
    (this.json = r.json || !1),
    (this.listener = r.listener || null),
    (this.implicitTypes = this.schema.compiledImplicit),
    (this.typeMap = this.schema.compiledTypeMap),
    (this.length = e.length),
    (this.position = 0),
    (this.line = 0),
    (this.lineStart = 0),
    (this.lineIndent = 0),
    (this.firstTabInLine = -1),
    (this.documents = []);
}
function Tt(e, r) {
  var t = {
    name: e.filename,
    buffer: e.input.slice(0, -1),
    // omit trailing \0
    position: e.position,
    line: e.line,
    column: e.position - e.lineStart,
  };
  return (t.snippet = An(t)), new ce(r, t);
}
function C(e, r) {
  throw Tt(e, r);
}
function Ye(e, r) {
  e.onWarning && e.onWarning.call(null, Tt(e, r));
}
var Ur = {
  YAML: function (r, t, s) {
    var i, n, o;
    r.version !== null && C(r, 'duplication of %YAML directive'),
      s.length !== 1 && C(r, 'YAML directive accepts exactly one argument'),
      (i = /^([0-9]+)\.([0-9]+)$/.exec(s[0])),
      i === null && C(r, 'ill-formed argument of the YAML directive'),
      (n = parseInt(i[1], 10)),
      (o = parseInt(i[2], 10)),
      n !== 1 && C(r, 'unacceptable YAML version of the document'),
      (r.version = s[0]),
      (r.checkLineBreaks = o < 2),
      o !== 1 && o !== 2 && Ye(r, 'unsupported YAML version of the document');
  },
  TAG: function (r, t, s) {
    var i, n;
    s.length !== 2 && C(r, 'TAG directive accepts exactly two arguments'),
      (i = s[0]),
      (n = s[1]),
      wt.test(i) || C(r, 'ill-formed tag handle (first argument) of the TAG directive'),
      be.call(r.tagMap, i) &&
        C(r, 'there is a previously declared suffix for "' + i + '" tag handle'),
      Ct.test(n) || C(r, 'ill-formed tag prefix (second argument) of the TAG directive');
    try {
      n = decodeURIComponent(n);
    } catch {
      C(r, 'tag prefix is malformed: ' + n);
    }
    r.tagMap[i] = n;
  },
};
function Ae(e, r, t, s) {
  var i, n, o, a;
  if (r < t) {
    if (((a = e.input.slice(r, t)), s))
      for (i = 0, n = a.length; i < n; i += 1)
        (o = a.charCodeAt(i)),
          o === 9 || (32 <= o && o <= 1114111) || C(e, 'expected valid JSON character');
    else Ai.test(a) && C(e, 'the stream contains non-printable characters');
    e.result += a;
  }
}
function qr(e, r, t, s) {
  var i, n, o, a;
  for (
    ee.isObject(t) || C(e, 'cannot merge mappings; the provided source object is unacceptable'),
      i = Object.keys(t),
      o = 0,
      a = i.length;
    o < a;
    o += 1
  )
    (n = i[o]), be.call(r, n) || ((r[n] = t[n]), (s[n] = !0));
}
function Oe(e, r, t, s, i, n, o, a, l) {
  var p, c;
  if (Array.isArray(i))
    for (i = Array.prototype.slice.call(i), p = 0, c = i.length; p < c; p += 1)
      Array.isArray(i[p]) && C(e, 'nested arrays are not supported inside keys'),
        typeof i == 'object' && Fr(i[p]) === '[object Object]' && (i[p] = '[object Object]');
  if (
    (typeof i == 'object' && Fr(i) === '[object Object]' && (i = '[object Object]'),
    (i = String(i)),
    r === null && (r = {}),
    s === 'tag:yaml.org,2002:merge')
  )
    if (Array.isArray(n)) for (p = 0, c = n.length; p < c; p += 1) qr(e, r, n[p], t);
    else qr(e, r, n, t);
  else
    !e.json &&
      !be.call(t, i) &&
      be.call(r, i) &&
      ((e.line = o || e.line),
      (e.lineStart = a || e.lineStart),
      (e.position = l || e.position),
      C(e, 'duplicated mapping key')),
      i === '__proto__'
        ? Object.defineProperty(r, i, {
            configurable: !0,
            enumerable: !0,
            writable: !0,
            value: n,
          })
        : (r[i] = n),
      delete t[i];
  return r;
}
function Rr(e) {
  var r;
  (r = e.input.charCodeAt(e.position)),
    r === 10
      ? e.position++
      : r === 13
      ? (e.position++, e.input.charCodeAt(e.position) === 10 && e.position++)
      : C(e, 'a line break is expected'),
    (e.line += 1),
    (e.lineStart = e.position),
    (e.firstTabInLine = -1);
}
function Z(e, r, t) {
  for (var s = 0, i = e.input.charCodeAt(e.position); i !== 0; ) {
    for (; Re(i); )
      i === 9 && e.firstTabInLine === -1 && (e.firstTabInLine = e.position),
        (i = e.input.charCodeAt(++e.position));
    if (r && i === 35)
      do i = e.input.charCodeAt(++e.position);
      while (i !== 10 && i !== 13 && i !== 0);
    if (he(i))
      for (Rr(e), i = e.input.charCodeAt(e.position), s++, e.lineIndent = 0; i === 32; )
        e.lineIndent++, (i = e.input.charCodeAt(++e.position));
    else break;
  }
  return t !== -1 && s !== 0 && e.lineIndent < t && Ye(e, 'deficient indentation'), s;
}
function er(e) {
  var r = e.position,
    t;
  return (
    (t = e.input.charCodeAt(r)),
    !!(
      (t === 45 || t === 46) &&
      t === e.input.charCodeAt(r + 1) &&
      t === e.input.charCodeAt(r + 2) &&
      ((r += 3), (t = e.input.charCodeAt(r)), t === 0 || pe(t))
    )
  );
}
function Er(e, r) {
  r === 1
    ? (e.result += ' ')
    : r > 1 &&
      (e.result += ee.repeat(
        `
`,
        r - 1
      ));
}
function Pi(e, r, t) {
  var s,
    i,
    n,
    o,
    a,
    l,
    p,
    c,
    f = e.kind,
    u = e.result,
    d;
  if (
    ((d = e.input.charCodeAt(e.position)),
    pe(d) ||
      Pe(d) ||
      d === 35 ||
      d === 38 ||
      d === 42 ||
      d === 33 ||
      d === 124 ||
      d === 62 ||
      d === 39 ||
      d === 34 ||
      d === 37 ||
      d === 64 ||
      d === 96 ||
      ((d === 63 || d === 45) && ((i = e.input.charCodeAt(e.position + 1)), pe(i) || (t && Pe(i)))))
  )
    return !1;
  for (e.kind = 'scalar', e.result = '', n = o = e.position, a = !1; d !== 0; ) {
    if (d === 58) {
      if (((i = e.input.charCodeAt(e.position + 1)), pe(i) || (t && Pe(i)))) break;
    } else if (d === 35) {
      if (((s = e.input.charCodeAt(e.position - 1)), pe(s))) break;
    } else {
      if ((e.position === e.lineStart && er(e)) || (t && Pe(d))) break;
      if (he(d))
        if (
          ((l = e.line), (p = e.lineStart), (c = e.lineIndent), Z(e, !1, -1), e.lineIndent >= r)
        ) {
          (a = !0), (d = e.input.charCodeAt(e.position));
          continue;
        } else {
          (e.position = o), (e.line = l), (e.lineStart = p), (e.lineIndent = c);
          break;
        }
    }
    a && (Ae(e, n, o, !1), Er(e, e.line - l), (n = o = e.position), (a = !1)),
      Re(d) || (o = e.position + 1),
      (d = e.input.charCodeAt(++e.position));
  }
  return Ae(e, n, o, !1), e.result ? !0 : ((e.kind = f), (e.result = u), !1);
}
function Oi(e, r) {
  var t, s, i;
  if (((t = e.input.charCodeAt(e.position)), t !== 39)) return !1;
  for (
    e.kind = 'scalar', e.result = '', e.position++, s = i = e.position;
    (t = e.input.charCodeAt(e.position)) !== 0;

  )
    if (t === 39)
      if ((Ae(e, s, e.position, !0), (t = e.input.charCodeAt(++e.position)), t === 39))
        (s = e.position), e.position++, (i = e.position);
      else return !0;
    else
      he(t)
        ? (Ae(e, s, i, !0), Er(e, Z(e, !1, r)), (s = i = e.position))
        : e.position === e.lineStart && er(e)
        ? C(e, 'unexpected end of the document within a single quoted scalar')
        : (e.position++, (i = e.position));
  C(e, 'unexpected end of the stream within a single quoted scalar');
}
function Ti(e, r) {
  var t, s, i, n, o, a;
  if (((a = e.input.charCodeAt(e.position)), a !== 34)) return !1;
  for (
    e.kind = 'scalar', e.result = '', e.position++, t = s = e.position;
    (a = e.input.charCodeAt(e.position)) !== 0;

  ) {
    if (a === 34) return Ae(e, t, e.position, !0), e.position++, !0;
    if (a === 92) {
      if ((Ae(e, t, e.position, !0), (a = e.input.charCodeAt(++e.position)), he(a))) Z(e, !1, r);
      else if (a < 256 && Pt[a]) (e.result += Ot[a]), e.position++;
      else if ((o = Ei(a)) > 0) {
        for (i = o, n = 0; i > 0; i--)
          (a = e.input.charCodeAt(++e.position)),
            (o = Ri(a)) >= 0 ? (n = (n << 4) + o) : C(e, 'expected hexadecimal character');
        (e.result += wi(n)), e.position++;
      } else C(e, 'unknown escape sequence');
      t = s = e.position;
    } else
      he(a)
        ? (Ae(e, t, s, !0), Er(e, Z(e, !1, r)), (t = s = e.position))
        : e.position === e.lineStart && er(e)
        ? C(e, 'unexpected end of the document within a double quoted scalar')
        : (e.position++, (s = e.position));
  }
  C(e, 'unexpected end of the stream within a double quoted scalar');
}
function Li(e, r) {
  var t = !0,
    s,
    i,
    n,
    o = e.tag,
    a,
    l = e.anchor,
    p,
    c,
    f,
    u,
    d,
    m = /* @__PURE__ */ Object.create(null),
    x,
    S,
    A,
    v;
  if (((v = e.input.charCodeAt(e.position)), v === 91)) (c = 93), (d = !1), (a = []);
  else if (v === 123) (c = 125), (d = !0), (a = {});
  else return !1;
  for (
    e.anchor !== null && (e.anchorMap[e.anchor] = a), v = e.input.charCodeAt(++e.position);
    v !== 0;

  ) {
    if ((Z(e, !0, r), (v = e.input.charCodeAt(e.position)), v === c))
      return (
        e.position++,
        (e.tag = o),
        (e.anchor = l),
        (e.kind = d ? 'mapping' : 'sequence'),
        (e.result = a),
        !0
      );
    t
      ? v === 44 && C(e, "expected the node content, but found ','")
      : C(e, 'missed comma between flow collection entries'),
      (S = x = A = null),
      (f = u = !1),
      v === 63 &&
        ((p = e.input.charCodeAt(e.position + 1)),
        pe(p) && ((f = u = !0), e.position++, Z(e, !0, r))),
      (s = e.line),
      (i = e.lineStart),
      (n = e.position),
      Ie(e, r, Ve, !1, !0),
      (S = e.tag),
      (x = e.result),
      Z(e, !0, r),
      (v = e.input.charCodeAt(e.position)),
      (u || e.line === s) &&
        v === 58 &&
        ((f = !0),
        (v = e.input.charCodeAt(++e.position)),
        Z(e, !0, r),
        Ie(e, r, Ve, !1, !0),
        (A = e.result)),
      d ? Oe(e, a, m, S, x, A, s, i, n) : f ? a.push(Oe(e, null, m, S, x, A, s, i, n)) : a.push(x),
      Z(e, !0, r),
      (v = e.input.charCodeAt(e.position)),
      v === 44 ? ((t = !0), (v = e.input.charCodeAt(++e.position))) : (t = !1);
  }
  C(e, 'unexpected end of the stream within a flow collection');
}
function ki(e, r) {
  var t,
    s,
    i = pr,
    n = !1,
    o = !1,
    a = r,
    l = 0,
    p = !1,
    c,
    f;
  if (((f = e.input.charCodeAt(e.position)), f === 124)) s = !1;
  else if (f === 62) s = !0;
  else return !1;
  for (e.kind = 'scalar', e.result = ''; f !== 0; )
    if (((f = e.input.charCodeAt(++e.position)), f === 43 || f === 45))
      pr === i ? (i = f === 43 ? Mr : vi) : C(e, 'repeat of a chomping mode identifier');
    else if ((c = _i(f)) >= 0)
      c === 0
        ? C(e, 'bad explicit indentation width of a block scalar; it cannot be less than one')
        : o
        ? C(e, 'repeat of an indentation width identifier')
        : ((a = r + c - 1), (o = !0));
    else break;
  if (Re(f)) {
    do f = e.input.charCodeAt(++e.position);
    while (Re(f));
    if (f === 35)
      do f = e.input.charCodeAt(++e.position);
      while (!he(f) && f !== 0);
  }
  for (; f !== 0; ) {
    for (
      Rr(e), e.lineIndent = 0, f = e.input.charCodeAt(e.position);
      (!o || e.lineIndent < a) && f === 32;

    )
      e.lineIndent++, (f = e.input.charCodeAt(++e.position));
    if ((!o && e.lineIndent > a && (a = e.lineIndent), he(f))) {
      l++;
      continue;
    }
    if (e.lineIndent < a) {
      i === Mr
        ? (e.result += ee.repeat(
            `
`,
            n ? 1 + l : l
          ))
        : i === pr &&
          n &&
          (e.result += `
`);
      break;
    }
    for (
      s
        ? Re(f)
          ? ((p = !0),
            (e.result += ee.repeat(
              `
`,
              n ? 1 + l : l
            )))
          : p
          ? ((p = !1),
            (e.result += ee.repeat(
              `
`,
              l + 1
            )))
          : l === 0
          ? n && (e.result += ' ')
          : (e.result += ee.repeat(
              `
`,
              l
            ))
        : (e.result += ee.repeat(
            `
`,
            n ? 1 + l : l
          )),
        n = !0,
        o = !0,
        l = 0,
        t = e.position;
      !he(f) && f !== 0;

    )
      f = e.input.charCodeAt(++e.position);
    Ae(e, t, e.position, !1);
  }
  return !0;
}
function Br(e, r) {
  var t,
    s = e.tag,
    i = e.anchor,
    n = [],
    o,
    a = !1,
    l;
  if (e.firstTabInLine !== -1) return !1;
  for (
    e.anchor !== null && (e.anchorMap[e.anchor] = n), l = e.input.charCodeAt(e.position);
    l !== 0 &&
    (e.firstTabInLine !== -1 &&
      ((e.position = e.firstTabInLine), C(e, 'tab characters must not be used in indentation')),
    !(l !== 45 || ((o = e.input.charCodeAt(e.position + 1)), !pe(o))));

  ) {
    if (((a = !0), e.position++, Z(e, !0, -1) && e.lineIndent <= r)) {
      n.push(null), (l = e.input.charCodeAt(e.position));
      continue;
    }
    if (
      ((t = e.line),
      Ie(e, r, _t, !1, !0),
      n.push(e.result),
      Z(e, !0, -1),
      (l = e.input.charCodeAt(e.position)),
      (e.line === t || e.lineIndent > r) && l !== 0)
    )
      C(e, 'bad indentation of a sequence entry');
    else if (e.lineIndent < r) break;
  }
  return a ? ((e.tag = s), (e.anchor = i), (e.kind = 'sequence'), (e.result = n), !0) : !1;
}
function Ii(e, r, t) {
  var s,
    i,
    n,
    o,
    a,
    l,
    p = e.tag,
    c = e.anchor,
    f = {},
    u = /* @__PURE__ */ Object.create(null),
    d = null,
    m = null,
    x = null,
    S = !1,
    A = !1,
    v;
  if (e.firstTabInLine !== -1) return !1;
  for (
    e.anchor !== null && (e.anchorMap[e.anchor] = f), v = e.input.charCodeAt(e.position);
    v !== 0;

  ) {
    if (
      (!S &&
        e.firstTabInLine !== -1 &&
        ((e.position = e.firstTabInLine), C(e, 'tab characters must not be used in indentation')),
      (s = e.input.charCodeAt(e.position + 1)),
      (n = e.line),
      (v === 63 || v === 58) && pe(s))
    )
      v === 63
        ? (S && (Oe(e, f, u, d, m, null, o, a, l), (d = m = x = null)),
          (A = !0),
          (S = !0),
          (i = !0))
        : S
        ? ((S = !1), (i = !0))
        : C(
            e,
            'incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line'
          ),
        (e.position += 1),
        (v = s);
    else {
      if (((o = e.line), (a = e.lineStart), (l = e.position), !Ie(e, t, Et, !1, !0))) break;
      if (e.line === n) {
        for (v = e.input.charCodeAt(e.position); Re(v); ) v = e.input.charCodeAt(++e.position);
        if (v === 58)
          (v = e.input.charCodeAt(++e.position)),
            pe(v) ||
              C(
                e,
                'a whitespace character is expected after the key-value separator within a block mapping'
              ),
            S && (Oe(e, f, u, d, m, null, o, a, l), (d = m = x = null)),
            (A = !0),
            (S = !1),
            (i = !1),
            (d = e.tag),
            (m = e.result);
        else if (A) C(e, 'can not read an implicit mapping pair; a colon is missed');
        else return (e.tag = p), (e.anchor = c), !0;
      } else if (A)
        C(e, 'can not read a block mapping entry; a multiline key may not be an implicit key');
      else return (e.tag = p), (e.anchor = c), !0;
    }
    if (
      ((e.line === n || e.lineIndent > r) &&
        (S && ((o = e.line), (a = e.lineStart), (l = e.position)),
        Ie(e, r, Ke, !0, i) && (S ? (m = e.result) : (x = e.result)),
        S || (Oe(e, f, u, d, m, x, o, a, l), (d = m = x = null)),
        Z(e, !0, -1),
        (v = e.input.charCodeAt(e.position))),
      (e.line === n || e.lineIndent > r) && v !== 0)
    )
      C(e, 'bad indentation of a mapping entry');
    else if (e.lineIndent < r) break;
  }
  return (
    S && Oe(e, f, u, d, m, null, o, a, l),
    A && ((e.tag = p), (e.anchor = c), (e.kind = 'mapping'), (e.result = f)),
    A
  );
}
function $i(e) {
  var r,
    t = !1,
    s = !1,
    i,
    n,
    o;
  if (((o = e.input.charCodeAt(e.position)), o !== 33)) return !1;
  if (
    (e.tag !== null && C(e, 'duplication of a tag property'),
    (o = e.input.charCodeAt(++e.position)),
    o === 60
      ? ((t = !0), (o = e.input.charCodeAt(++e.position)))
      : o === 33
      ? ((s = !0), (i = '!!'), (o = e.input.charCodeAt(++e.position)))
      : (i = '!'),
    (r = e.position),
    t)
  ) {
    do o = e.input.charCodeAt(++e.position);
    while (o !== 0 && o !== 62);
    e.position < e.length
      ? ((n = e.input.slice(r, e.position)), (o = e.input.charCodeAt(++e.position)))
      : C(e, 'unexpected end of the stream within a verbatim tag');
  } else {
    for (; o !== 0 && !pe(o); )
      o === 33 &&
        (s
          ? C(e, 'tag suffix cannot contain exclamation marks')
          : ((i = e.input.slice(r - 1, e.position + 1)),
            wt.test(i) || C(e, 'named tag handle cannot contain such characters'),
            (s = !0),
            (r = e.position + 1))),
        (o = e.input.charCodeAt(++e.position));
    (n = e.input.slice(r, e.position)),
      Si.test(n) && C(e, 'tag suffix cannot contain flow indicator characters');
  }
  n && !Ct.test(n) && C(e, 'tag name cannot contain such characters: ' + n);
  try {
    n = decodeURIComponent(n);
  } catch {
    C(e, 'tag name is malformed: ' + n);
  }
  return (
    t
      ? (e.tag = n)
      : be.call(e.tagMap, i)
      ? (e.tag = e.tagMap[i] + n)
      : i === '!'
      ? (e.tag = '!' + n)
      : i === '!!'
      ? (e.tag = 'tag:yaml.org,2002:' + n)
      : C(e, 'undeclared tag handle "' + i + '"'),
    !0
  );
}
function Ni(e) {
  var r, t;
  if (((t = e.input.charCodeAt(e.position)), t !== 38)) return !1;
  for (
    e.anchor !== null && C(e, 'duplication of an anchor property'),
      t = e.input.charCodeAt(++e.position),
      r = e.position;
    t !== 0 && !pe(t) && !Pe(t);

  )
    t = e.input.charCodeAt(++e.position);
  return (
    e.position === r && C(e, 'name of an anchor node must contain at least one character'),
    (e.anchor = e.input.slice(r, e.position)),
    !0
  );
}
function Di(e) {
  var r, t, s;
  if (((s = e.input.charCodeAt(e.position)), s !== 42)) return !1;
  for (s = e.input.charCodeAt(++e.position), r = e.position; s !== 0 && !pe(s) && !Pe(s); )
    s = e.input.charCodeAt(++e.position);
  return (
    e.position === r && C(e, 'name of an alias node must contain at least one character'),
    (t = e.input.slice(r, e.position)),
    be.call(e.anchorMap, t) || C(e, 'unidentified alias "' + t + '"'),
    (e.result = e.anchorMap[t]),
    Z(e, !0, -1),
    !0
  );
}
function Ie(e, r, t, s, i) {
  var n,
    o,
    a,
    l = 1,
    p = !1,
    c = !1,
    f,
    u,
    d,
    m,
    x,
    S;
  if (
    (e.listener !== null && e.listener('open', e),
    (e.tag = null),
    (e.anchor = null),
    (e.kind = null),
    (e.result = null),
    (n = o = a = Ke === t || _t === t),
    s &&
      Z(e, !0, -1) &&
      ((p = !0),
      e.lineIndent > r ? (l = 1) : e.lineIndent === r ? (l = 0) : e.lineIndent < r && (l = -1)),
    l === 1)
  )
    for (; $i(e) || Ni(e); )
      Z(e, !0, -1)
        ? ((p = !0),
          (a = n),
          e.lineIndent > r ? (l = 1) : e.lineIndent === r ? (l = 0) : e.lineIndent < r && (l = -1))
        : (a = !1);
  if (
    (a && (a = p || i),
    (l === 1 || Ke === t) &&
      (Ve === t || Et === t ? (x = r) : (x = r + 1),
      (S = e.position - e.lineStart),
      l === 1
        ? (a && (Br(e, S) || Ii(e, S, x))) || Li(e, x)
          ? (c = !0)
          : ((o && ki(e, x)) || Oi(e, x) || Ti(e, x)
              ? (c = !0)
              : Di(e)
              ? ((c = !0),
                (e.tag !== null || e.anchor !== null) &&
                  C(e, 'alias node should not have any properties'))
              : Pi(e, x, Ve === t) && ((c = !0), e.tag === null && (e.tag = '?')),
            e.anchor !== null && (e.anchorMap[e.anchor] = e.result))
        : l === 0 && (c = a && Br(e, S))),
    e.tag === null)
  )
    e.anchor !== null && (e.anchorMap[e.anchor] = e.result);
  else if (e.tag === '?') {
    for (
      e.result !== null &&
        e.kind !== 'scalar' &&
        C(e, 'unacceptable node kind for !<?> tag; it should be "scalar", not "' + e.kind + '"'),
        f = 0,
        u = e.implicitTypes.length;
      f < u;
      f += 1
    )
      if (((m = e.implicitTypes[f]), m.resolve(e.result))) {
        (e.result = m.construct(e.result)),
          (e.tag = m.tag),
          e.anchor !== null && (e.anchorMap[e.anchor] = e.result);
        break;
      }
  } else if (e.tag !== '!') {
    if (be.call(e.typeMap[e.kind || 'fallback'], e.tag)) m = e.typeMap[e.kind || 'fallback'][e.tag];
    else
      for (m = null, d = e.typeMap.multi[e.kind || 'fallback'], f = 0, u = d.length; f < u; f += 1)
        if (e.tag.slice(0, d[f].tag.length) === d[f].tag) {
          m = d[f];
          break;
        }
    m || C(e, 'unknown tag !<' + e.tag + '>'),
      e.result !== null &&
        m.kind !== e.kind &&
        C(
          e,
          'unacceptable node kind for !<' +
            e.tag +
            '> tag; it should be "' +
            m.kind +
            '", not "' +
            e.kind +
            '"'
        ),
      m.resolve(e.result, e.tag)
        ? ((e.result = m.construct(e.result, e.tag)),
          e.anchor !== null && (e.anchorMap[e.anchor] = e.result))
        : C(e, 'cannot resolve a node with !<' + e.tag + '> explicit tag');
  }
  return e.listener !== null && e.listener('close', e), e.tag !== null || e.anchor !== null || c;
}
function Mi(e) {
  var r = e.position,
    t,
    s,
    i,
    n = !1,
    o;
  for (
    e.version = null,
      e.checkLineBreaks = e.legacy,
      e.tagMap = /* @__PURE__ */ Object.create(null),
      e.anchorMap = /* @__PURE__ */ Object.create(null);
    (o = e.input.charCodeAt(e.position)) !== 0 &&
    (Z(e, !0, -1), (o = e.input.charCodeAt(e.position)), !(e.lineIndent > 0 || o !== 37));

  ) {
    for (n = !0, o = e.input.charCodeAt(++e.position), t = e.position; o !== 0 && !pe(o); )
      o = e.input.charCodeAt(++e.position);
    for (
      s = e.input.slice(t, e.position),
        i = [],
        s.length < 1 && C(e, 'directive name must not be less than one character in length');
      o !== 0;

    ) {
      for (; Re(o); ) o = e.input.charCodeAt(++e.position);
      if (o === 35) {
        do o = e.input.charCodeAt(++e.position);
        while (o !== 0 && !he(o));
        break;
      }
      if (he(o)) break;
      for (t = e.position; o !== 0 && !pe(o); ) o = e.input.charCodeAt(++e.position);
      i.push(e.input.slice(t, e.position));
    }
    o !== 0 && Rr(e),
      be.call(Ur, s) ? Ur[s](e, s, i) : Ye(e, 'unknown document directive "' + s + '"');
  }
  if (
    (Z(e, !0, -1),
    e.lineIndent === 0 &&
    e.input.charCodeAt(e.position) === 45 &&
    e.input.charCodeAt(e.position + 1) === 45 &&
    e.input.charCodeAt(e.position + 2) === 45
      ? ((e.position += 3), Z(e, !0, -1))
      : n && C(e, 'directives end mark is expected'),
    Ie(e, e.lineIndent - 1, Ke, !1, !0),
    Z(e, !0, -1),
    e.checkLineBreaks &&
      bi.test(e.input.slice(r, e.position)) &&
      Ye(e, 'non-ASCII line breaks are interpreted as content'),
    e.documents.push(e.result),
    e.position === e.lineStart && er(e))
  ) {
    e.input.charCodeAt(e.position) === 46 && ((e.position += 3), Z(e, !0, -1));
    return;
  }
  if (e.position < e.length - 1) C(e, 'end of the stream or a document separator is expected');
  else return;
}
function Fi(e, r) {
  (e = String(e)),
    (r = r || {}),
    e.length !== 0 &&
      (e.charCodeAt(e.length - 1) !== 10 &&
        e.charCodeAt(e.length - 1) !== 13 &&
        (e += `
`),
      e.charCodeAt(0) === 65279 && (e = e.slice(1)));
  var t = new Ci(e, r),
    s = e.indexOf('\0');
  for (
    s !== -1 && ((t.position = s), C(t, 'null byte is not allowed in input')), t.input += '\0';
    t.input.charCodeAt(t.position) === 32;

  )
    (t.lineIndent += 1), (t.position += 1);
  for (; t.position < t.length - 1; ) Mi(t);
  return t.documents;
}
function Hi(e, r) {
  var t = Fi(e, r);
  if (t.length !== 0) {
    if (t.length === 1) return t[0];
    throw new ce('expected a single document in the stream, but found more');
  }
}
var Ui = Hi,
  qi = {
    load: Ui,
  },
  Lt = Object.prototype.toString,
  kt = Object.prototype.hasOwnProperty,
  _r = 65279,
  Bi = 9,
  He = 10,
  ji = 13,
  zi = 32,
  Gi = 33,
  Vi = 34,
  yr = 35,
  Ki = 37,
  Yi = 38,
  Wi = 39,
  Xi = 42,
  It = 44,
  Qi = 45,
  We = 58,
  Zi = 61,
  Ji = 62,
  eo = 63,
  ro = 64,
  $t = 91,
  Nt = 93,
  to = 96,
  Dt = 123,
  no = 124,
  Mt = 125,
  se = {};
se[0] = '\\0';
se[7] = '\\a';
se[8] = '\\b';
se[9] = '\\t';
se[10] = '\\n';
se[11] = '\\v';
se[12] = '\\f';
se[13] = '\\r';
se[27] = '\\e';
se[34] = '\\"';
se[92] = '\\\\';
se[133] = '\\N';
se[160] = '\\_';
se[8232] = '\\L';
se[8233] = '\\P';
var io = [
    'y',
    'Y',
    'yes',
    'Yes',
    'YES',
    'on',
    'On',
    'ON',
    'n',
    'N',
    'no',
    'No',
    'NO',
    'off',
    'Off',
    'OFF',
  ],
  oo = /^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;
function so(e, r) {
  var t, s, i, n, o, a, l;
  if (r === null) return {};
  for (t = {}, s = Object.keys(r), i = 0, n = s.length; i < n; i += 1)
    (o = s[i]),
      (a = String(r[o])),
      o.slice(0, 2) === '!!' && (o = 'tag:yaml.org,2002:' + o.slice(2)),
      (l = e.compiledTypeMap.fallback[o]),
      l && kt.call(l.styleAliases, a) && (a = l.styleAliases[a]),
      (t[o] = a);
  return t;
}
function ao(e) {
  var r, t, s;
  if (((r = e.toString(16).toUpperCase()), e <= 255)) (t = 'x'), (s = 2);
  else if (e <= 65535) (t = 'u'), (s = 4);
  else if (e <= 4294967295) (t = 'U'), (s = 8);
  else throw new ce('code point within a string may not be greater than 0xFFFFFFFF');
  return '\\' + t + ee.repeat('0', s - r.length) + r;
}
var lo = 1,
  Ue = 2;
function uo(e) {
  (this.schema = e.schema || Rt),
    (this.indent = Math.max(1, e.indent || 2)),
    (this.noArrayIndent = e.noArrayIndent || !1),
    (this.skipInvalid = e.skipInvalid || !1),
    (this.flowLevel = ee.isNothing(e.flowLevel) ? -1 : e.flowLevel),
    (this.styleMap = so(this.schema, e.styles || null)),
    (this.sortKeys = e.sortKeys || !1),
    (this.lineWidth = e.lineWidth || 80),
    (this.noRefs = e.noRefs || !1),
    (this.noCompatMode = e.noCompatMode || !1),
    (this.condenseFlow = e.condenseFlow || !1),
    (this.quotingType = e.quotingType === '"' ? Ue : lo),
    (this.forceQuotes = e.forceQuotes || !1),
    (this.replacer = typeof e.replacer == 'function' ? e.replacer : null),
    (this.implicitTypes = this.schema.compiledImplicit),
    (this.explicitTypes = this.schema.compiledExplicit),
    (this.tag = null),
    (this.result = ''),
    (this.duplicates = []),
    (this.usedDuplicates = null);
}
function jr(e, r) {
  for (var t = ee.repeat(' ', r), s = 0, i = -1, n = '', o, a = e.length; s < a; )
    (i = e.indexOf(
      `
`,
      s
    )),
      i === -1 ? ((o = e.slice(s)), (s = a)) : ((o = e.slice(s, i + 1)), (s = i + 1)),
      o.length &&
        o !==
          `
` &&
        (n += t),
      (n += o);
  return n;
}
function gr(e, r) {
  return (
    `
` + ee.repeat(' ', e.indent * r)
  );
}
function co(e, r) {
  var t, s, i;
  for (t = 0, s = e.implicitTypes.length; t < s; t += 1)
    if (((i = e.implicitTypes[t]), i.resolve(r))) return !0;
  return !1;
}
function Xe(e) {
  return e === zi || e === Bi;
}
function qe(e) {
  return (
    (32 <= e && e <= 126) ||
    (161 <= e && e <= 55295 && e !== 8232 && e !== 8233) ||
    (57344 <= e && e <= 65533 && e !== _r) ||
    (65536 <= e && e <= 1114111)
  );
}
function zr(e) {
  return qe(e) && e !== _r && e !== ji && e !== He;
}
function Gr(e, r, t) {
  var s = zr(e),
    i = s && !Xe(e);
  return (
    // ns-plain-safe
    ((t
      ? // c = flow-in
        s
      : s && e !== It && e !== $t && e !== Nt && e !== Dt && e !== Mt) &&
      e !== yr &&
      !(r === We && !i)) ||
    (zr(r) && !Xe(r) && e === yr) ||
    (r === We && i)
  );
}
function po(e) {
  return (
    qe(e) &&
    e !== _r &&
    !Xe(e) &&
    e !== Qi &&
    e !== eo &&
    e !== We &&
    e !== It &&
    e !== $t &&
    e !== Nt &&
    e !== Dt &&
    e !== Mt &&
    e !== yr &&
    e !== Yi &&
    e !== Xi &&
    e !== Gi &&
    e !== no &&
    e !== Zi &&
    e !== Ji &&
    e !== Wi &&
    e !== Vi &&
    e !== Ki &&
    e !== ro &&
    e !== to
  );
}
function fo(e) {
  return !Xe(e) && e !== We;
}
function De(e, r) {
  var t = e.charCodeAt(r),
    s;
  return t >= 55296 &&
    t <= 56319 &&
    r + 1 < e.length &&
    ((s = e.charCodeAt(r + 1)), s >= 56320 && s <= 57343)
    ? (t - 55296) * 1024 + s - 56320 + 65536
    : t;
}
function Ft(e) {
  var r = /^\n* /;
  return r.test(e);
}
var Ht = 1,
  xr = 2,
  Ut = 3,
  qt = 4,
  Ce = 5;
function mo(e, r, t, s, i, n, o, a) {
  var l,
    p = 0,
    c = null,
    f = !1,
    u = !1,
    d = s !== -1,
    m = -1,
    x = po(De(e, 0)) && fo(De(e, e.length - 1));
  if (r || o)
    for (l = 0; l < e.length; p >= 65536 ? (l += 2) : l++) {
      if (((p = De(e, l)), !qe(p))) return Ce;
      (x = x && Gr(p, c, a)), (c = p);
    }
  else {
    for (l = 0; l < e.length; p >= 65536 ? (l += 2) : l++) {
      if (((p = De(e, l)), p === He))
        (f = !0),
          d &&
            ((u =
              u || // Foldable line = too long, and not more-indented.
              (l - m - 1 > s && e[m + 1] !== ' ')),
            (m = l));
      else if (!qe(p)) return Ce;
      (x = x && Gr(p, c, a)), (c = p);
    }
    u = u || (d && l - m - 1 > s && e[m + 1] !== ' ');
  }
  return !f && !u
    ? x && !o && !i(e)
      ? Ht
      : n === Ue
      ? Ce
      : xr
    : t > 9 && Ft(e)
    ? Ce
    : o
    ? n === Ue
      ? Ce
      : xr
    : u
    ? qt
    : Ut;
}
function ho(e, r, t, s, i) {
  e.dump = (function () {
    if (r.length === 0) return e.quotingType === Ue ? '""' : "''";
    if (!e.noCompatMode && (io.indexOf(r) !== -1 || oo.test(r)))
      return e.quotingType === Ue ? '"' + r + '"' : "'" + r + "'";
    var n = e.indent * Math.max(1, t),
      o = e.lineWidth === -1 ? -1 : Math.max(Math.min(e.lineWidth, 40), e.lineWidth - n),
      a = s || (e.flowLevel > -1 && t >= e.flowLevel);
    function l(p) {
      return co(e, p);
    }
    switch (mo(r, a, e.indent, o, l, e.quotingType, e.forceQuotes && !s, i)) {
      case Ht:
        return r;
      case xr:
        return "'" + r.replace(/'/g, "''") + "'";
      case Ut:
        return '|' + Vr(r, e.indent) + Kr(jr(r, n));
      case qt:
        return '>' + Vr(r, e.indent) + Kr(jr(yo(r, o), n));
      case Ce:
        return '"' + go(r) + '"';
      default:
        throw new ce('impossible error: invalid scalar style');
    }
  })();
}
function Vr(e, r) {
  var t = Ft(e) ? String(r) : '',
    s =
      e[e.length - 1] ===
      `
`,
    i =
      s &&
      (e[e.length - 2] ===
        `
` ||
        e ===
          `
`),
    n = i ? '+' : s ? '' : '-';
  return (
    t +
    n +
    `
`
  );
}
function Kr(e) {
  return e[e.length - 1] ===
    `
`
    ? e.slice(0, -1)
    : e;
}
function yo(e, r) {
  for (
    var t = /(\n+)([^\n]*)/g,
      s = (function () {
        var p = e.indexOf(`
`);
        return (p = p !== -1 ? p : e.length), (t.lastIndex = p), Yr(e.slice(0, p), r);
      })(),
      i =
        e[0] ===
          `
` || e[0] === ' ',
      n,
      o;
    (o = t.exec(e));

  ) {
    var a = o[1],
      l = o[2];
    (n = l[0] === ' '),
      (s +=
        a +
        (!i && !n && l !== ''
          ? `
`
          : '') +
        Yr(l, r)),
      (i = n);
  }
  return s;
}
function Yr(e, r) {
  if (e === '' || e[0] === ' ') return e;
  for (var t = / [^ ]/g, s, i = 0, n, o = 0, a = 0, l = ''; (s = t.exec(e)); )
    (a = s.index),
      a - i > r &&
        ((n = o > i ? o : a),
        (l +=
          `
` + e.slice(i, n)),
        (i = n + 1)),
      (o = a);
  return (
    (l += `
`),
    e.length - i > r && o > i
      ? (l +=
          e.slice(i, o) +
          `
` +
          e.slice(o + 1))
      : (l += e.slice(i)),
    l.slice(1)
  );
}
function go(e) {
  for (var r = '', t = 0, s, i = 0; i < e.length; t >= 65536 ? (i += 2) : i++)
    (t = De(e, i)),
      (s = se[t]),
      !s && qe(t) ? ((r += e[i]), t >= 65536 && (r += e[i + 1])) : (r += s || ao(t));
  return r;
}
function xo(e, r, t) {
  var s = '',
    i = e.tag,
    n,
    o,
    a;
  for (n = 0, o = t.length; n < o; n += 1)
    (a = t[n]),
      e.replacer && (a = e.replacer.call(t, String(n), a)),
      (ge(e, r, a, !1, !1) || (typeof a > 'u' && ge(e, r, null, !1, !1))) &&
        (s !== '' && (s += ',' + (e.condenseFlow ? '' : ' ')), (s += e.dump));
  (e.tag = i), (e.dump = '[' + s + ']');
}
function Wr(e, r, t, s) {
  var i = '',
    n = e.tag,
    o,
    a,
    l;
  for (o = 0, a = t.length; o < a; o += 1)
    (l = t[o]),
      e.replacer && (l = e.replacer.call(t, String(o), l)),
      (ge(e, r + 1, l, !0, !0, !1, !0) || (typeof l > 'u' && ge(e, r + 1, null, !0, !0, !1, !0))) &&
        ((!s || i !== '') && (i += gr(e, r)),
        e.dump && He === e.dump.charCodeAt(0) ? (i += '-') : (i += '- '),
        (i += e.dump));
  (e.tag = n), (e.dump = i || '[]');
}
function vo(e, r, t) {
  var s = '',
    i = e.tag,
    n = Object.keys(t),
    o,
    a,
    l,
    p,
    c;
  for (o = 0, a = n.length; o < a; o += 1)
    (c = ''),
      s !== '' && (c += ', '),
      e.condenseFlow && (c += '"'),
      (l = n[o]),
      (p = t[l]),
      e.replacer && (p = e.replacer.call(t, l, p)),
      ge(e, r, l, !1, !1) &&
        (e.dump.length > 1024 && (c += '? '),
        (c += e.dump + (e.condenseFlow ? '"' : '') + ':' + (e.condenseFlow ? '' : ' ')),
        ge(e, r, p, !1, !1) && ((c += e.dump), (s += c)));
  (e.tag = i), (e.dump = '{' + s + '}');
}
function Ao(e, r, t, s) {
  var i = '',
    n = e.tag,
    o = Object.keys(t),
    a,
    l,
    p,
    c,
    f,
    u;
  if (e.sortKeys === !0) o.sort();
  else if (typeof e.sortKeys == 'function') o.sort(e.sortKeys);
  else if (e.sortKeys) throw new ce('sortKeys must be a boolean or a function');
  for (a = 0, l = o.length; a < l; a += 1)
    (u = ''),
      (!s || i !== '') && (u += gr(e, r)),
      (p = o[a]),
      (c = t[p]),
      e.replacer && (c = e.replacer.call(t, p, c)),
      ge(e, r + 1, p, !0, !0, !0) &&
        ((f = (e.tag !== null && e.tag !== '?') || (e.dump && e.dump.length > 1024)),
        f && (e.dump && He === e.dump.charCodeAt(0) ? (u += '?') : (u += '? ')),
        (u += e.dump),
        f && (u += gr(e, r)),
        ge(e, r + 1, c, !0, f) &&
          (e.dump && He === e.dump.charCodeAt(0) ? (u += ':') : (u += ': '),
          (u += e.dump),
          (i += u)));
  (e.tag = n), (e.dump = i || '{}');
}
function Xr(e, r, t) {
  var s, i, n, o, a, l;
  for (i = t ? e.explicitTypes : e.implicitTypes, n = 0, o = i.length; n < o; n += 1)
    if (
      ((a = i[n]),
      (a.instanceOf || a.predicate) &&
        (!a.instanceOf || (typeof r == 'object' && r instanceof a.instanceOf)) &&
        (!a.predicate || a.predicate(r)))
    ) {
      if (
        (t
          ? a.multi && a.representName
            ? (e.tag = a.representName(r))
            : (e.tag = a.tag)
          : (e.tag = '?'),
        a.represent)
      ) {
        if (
          ((l = e.styleMap[a.tag] || a.defaultStyle), Lt.call(a.represent) === '[object Function]')
        )
          s = a.represent(r, l);
        else if (kt.call(a.represent, l)) s = a.represent[l](r, l);
        else throw new ce('!<' + a.tag + '> tag resolver accepts not "' + l + '" style');
        e.dump = s;
      }
      return !0;
    }
  return !1;
}
function ge(e, r, t, s, i, n, o) {
  (e.tag = null), (e.dump = t), Xr(e, t, !1) || Xr(e, t, !0);
  var a = Lt.call(e.dump),
    l = s,
    p;
  s && (s = e.flowLevel < 0 || e.flowLevel > r);
  var c = a === '[object Object]' || a === '[object Array]',
    f,
    u;
  if (
    (c && ((f = e.duplicates.indexOf(t)), (u = f !== -1)),
    ((e.tag !== null && e.tag !== '?') || u || (e.indent !== 2 && r > 0)) && (i = !1),
    u && e.usedDuplicates[f])
  )
    e.dump = '*ref_' + f;
  else {
    if ((c && u && !e.usedDuplicates[f] && (e.usedDuplicates[f] = !0), a === '[object Object]'))
      s && Object.keys(e.dump).length !== 0
        ? (Ao(e, r, e.dump, i), u && (e.dump = '&ref_' + f + e.dump))
        : (vo(e, r, e.dump), u && (e.dump = '&ref_' + f + ' ' + e.dump));
    else if (a === '[object Array]')
      s && e.dump.length !== 0
        ? (e.noArrayIndent && !o && r > 0 ? Wr(e, r - 1, e.dump, i) : Wr(e, r, e.dump, i),
          u && (e.dump = '&ref_' + f + e.dump))
        : (xo(e, r, e.dump), u && (e.dump = '&ref_' + f + ' ' + e.dump));
    else if (a === '[object String]') e.tag !== '?' && ho(e, e.dump, r, n, l);
    else {
      if (a === '[object Undefined]') return !1;
      if (e.skipInvalid) return !1;
      throw new ce('unacceptable kind of an object to dump ' + a);
    }
    e.tag !== null &&
      e.tag !== '?' &&
      ((p = encodeURI(e.tag[0] === '!' ? e.tag.slice(1) : e.tag).replace(/!/g, '%21')),
      e.tag[0] === '!'
        ? (p = '!' + p)
        : p.slice(0, 18) === 'tag:yaml.org,2002:'
        ? (p = '!!' + p.slice(18))
        : (p = '!<' + p + '>'),
      (e.dump = p + ' ' + e.dump));
  }
  return !0;
}
function bo(e, r) {
  var t = [],
    s = [],
    i,
    n;
  for (vr(e, t, s), i = 0, n = s.length; i < n; i += 1) r.duplicates.push(t[s[i]]);
  r.usedDuplicates = new Array(n);
}
function vr(e, r, t) {
  var s, i, n;
  if (e !== null && typeof e == 'object')
    if (((i = r.indexOf(e)), i !== -1)) t.indexOf(i) === -1 && t.push(i);
    else if ((r.push(e), Array.isArray(e))) for (i = 0, n = e.length; i < n; i += 1) vr(e[i], r, t);
    else for (s = Object.keys(e), i = 0, n = s.length; i < n; i += 1) vr(e[s[i]], r, t);
}
function So(e, r) {
  r = r || {};
  var t = new uo(r);
  t.noRefs || bo(e, t);
  var s = e;
  return (
    t.replacer && (s = t.replacer.call({ '': s }, '', s)),
    ge(t, 0, s, !0, !0)
      ? t.dump +
        `
`
      : ''
  );
}
var Ro = So,
  Eo = {
    dump: Ro,
  },
  _o = ht,
  wo = qi.load,
  Co = Eo.dump,
  $e = {
    binary: vt,
    pairs: bt,
    set: St,
    merge: xt,
    omap: At,
  };
const Po = _o.extend({
    implicit: [$e.merge],
    explicit: [$e.binary, $e.omap, $e.pairs, $e.set],
  }),
  Oo = (e, r) => wo(e, { schema: Po, ...r }),
  To = (e, r) => Co(e, r);
function Lo() {
  return new Promise((e) => {
    setTimeout(e);
  });
}
const ko = /\((\d+):(\d+)\)$/;
class Be extends Error {
  constructor(r, t) {
    super(
      r.message.split(`
`)[0]
    ),
      (this.originalError = r),
      (this.source = t),
      Object.setPrototypeOf(this, Be.prototype);
    const [, s, i] = this.message.match(ko) || [];
    (this.line = parseInt(s, 10)), (this.col = parseInt(i, 10));
  }
}
class Qr {
  constructor(r, t, s) {
    (this.absoluteRef = r), (this.body = t), (this.mimeType = s);
  }
  // pass safeLoad as argument to separate it from browser bundle
  getAst(r) {
    return (
      this._ast === void 0 &&
        ((this._ast = r(this.body, { filename: this.absoluteRef }) ?? void 0),
        this._ast &&
          this._ast.kind === 0 && // KIND.scalar = 0
          this._ast.value === '' &&
          this._ast.startPosition !== 1 &&
          ((this._ast.startPosition = 1), (this._ast.endPosition = 1))),
      this._ast
    );
  }
  getLines() {
    return this._lines === void 0 && (this._lines = this.body.split(/\r\n|[\n\r]/g)), this._lines;
  }
}
class wr extends Error {
  constructor(r) {
    super(r.message), (this.originalError = r), Object.setPrototypeOf(this, wr.prototype);
  }
}
function fr(e, r) {
  return e + '::' + r;
}
class Io {
  constructor(r = { http: { headers: [] } }) {
    (this.config = r), (this.cache = /* @__PURE__ */ new Map());
  }
  getFiles() {
    return new Set(Array.from(this.cache.keys()));
  }
  resolveExternalRef(r, t) {
    return Te(t)
      ? t
      : r && Te(r)
      ? new URL(t, r).href
      : me.resolve(r ? me.dirname(r) : process.cwd(), t);
  }
  async loadExternalRef(r) {
    try {
      if (Te(r)) {
        const { body: t, mimeType: s } = await sn(r, this.config.http);
        return new Qr(r, t, s);
      } else {
        if ((void 0)(r).isDirectory())
          throw new Error(`Expected a file but received a folder at ${r}.`);
        const t = await (void 0).readFile(r, 'utf-8');
        return new Qr(
          r,
          t.replace(
            /\r\n/g,
            `
`
          )
        );
      }
    } catch (t) {
      throw ((t.message = t.message.replace(', lstat', '')), new wr(t));
    }
  }
  parseDocument(r, t = !1) {
    const s = r.absoluteRef.substr(r.absoluteRef.lastIndexOf('.'));
    if (
      !['.json', '.json', '.yml', '.yaml'].includes(s) &&
      !r.mimeType?.match(/(json|yaml|openapi)/) &&
      !t
    )
      return { source: r, parsed: r.body };
    try {
      return {
        source: r,
        parsed: Oo(r.body, { filename: r.absoluteRef }),
      };
    } catch (i) {
      throw new Be(i, r);
    }
  }
  async resolveDocument(r, t, s = !1) {
    const i = this.resolveExternalRef(r, t),
      n = this.cache.get(i);
    if (n) return n;
    const o = this.loadExternalRef(i).then((a) => this.parseDocument(a, s));
    return this.cache.set(i, o), o;
  }
}
function Zr(e, r) {
  return {
    prev: e,
    node: r,
  };
}
function $o(e, r) {
  for (; e; ) {
    if (e.node === r) return !0;
    e = e.prev;
  }
  return !1;
}
const Ne = { name: 'unknown', properties: {} },
  No = { name: 'scalar', properties: {} };
async function Jr(e) {
  const { rootDocument: r, externalRefResolver: t, rootType: s } = e,
    i = /* @__PURE__ */ new Map(),
    n = /* @__PURE__ */ new Set(),
    o = [];
  l(r.parsed, r, '#/', s);
  let a;
  do a = await Promise.all(o);
  while (o.length !== a.length);
  return i;
  function l(p, c, f, u) {
    const d = c.source.absoluteRef,
      m = /* @__PURE__ */ new Map();
    x(p, u, d + f);
    function x(A, v, D) {
      if (typeof A != 'object' || A === null) return;
      const U = `${v.name}::${D}`;
      if (n.has(U)) return;
      n.add(U);
      const [M, Y] = Object.entries(A).find(([T]) => T === '$anchor') || [];
      if ((Y && m.set(`#${Y}`, A), Array.isArray(A))) {
        const T = v.items;
        if (T === void 0 && v !== Ne && v !== Le) return;
        const _ = typeof T == 'function';
        for (let R = 0; R < A.length; R++) {
          let q = _ ? T(A[R], we(D, R)) : T;
          if (q === void 0 && v !== Ne && v !== Le) continue;
          const k = q?.directResolveAs ? { $ref: A[R] } : A[R];
          (q = q?.directResolveAs || q), x(k, ke(q) ? q : Ne, we(D, R));
        }
        return;
      }
      for (const T of Object.keys(A)) {
        let _ = A[T],
          R = pt(v.properties, T);
        R === void 0 && (R = v.additionalProperties),
          typeof R == 'function' && (R = R(_, T)),
          R === void 0 && (R = Ne),
          v.extensionsPrefix && T.startsWith(v.extensionsPrefix) && R === Ne && (R = Le),
          !ke(R) && R?.directResolveAs && ((R = R.directResolveAs), (_ = { $ref: _ })),
          R && R.name === void 0 && R.resolvable !== !1 && (R = No),
          !(!ke(R) || typeof _ != 'object') && x(_, R, we(D, ze(T)));
      }
      if (ye(A)) {
        const T = S(c, A, {
          prev: null,
          node: A,
        }).then((_) => {
          _.resolved && l(_.node, _.document, _.nodePointer, v);
        });
        o.push(T);
      }
      if (ct(A)) {
        const T = S(
          c,
          { $ref: A.externalValue },
          {
            prev: null,
            node: A,
          }
        ).then((_) => {
          _.resolved && l(_.node, _.document, _.nodePointer, v);
        });
        o.push(T);
      }
    }
    async function S(A, v, D) {
      if ($o(D.prev, v)) throw new Error('Self-referencing circular pointer');
      if (Qt(v.$ref)) {
        await Lo();
        const P = {
            resolved: !0,
            isRemote: !1,
            node: m.get(v.$ref),
            document: A,
            nodePointer: v.$ref,
          },
          F = fr(A.source.absoluteRef, v.$ref);
        return i.set(F, P), P;
      }
      const { uri: U, pointer: M } = Kt(v.$ref),
        Y = U !== null;
      let T;
      try {
        T = Y ? await t.resolveDocument(A.source.absoluteRef, U) : A;
      } catch (P) {
        const F = {
            resolved: !1,
            isRemote: Y,
            document: void 0,
            error: P,
          },
          G = fr(A.source.absoluteRef, v.$ref);
        return i.set(G, F), F;
      }
      let _ = {
          resolved: !0,
          document: T,
          isRemote: Y,
          node: A.parsed,
          nodePointer: '#/',
        },
        R = T.parsed;
      const q = M;
      for (const P of q)
        if (typeof R != 'object') {
          R = void 0;
          break;
        } else if (R[P] !== void 0) (R = R[P]), (_.nodePointer = we(_.nodePointer, ze(P)));
        else if (ye(R)) {
          if (((_ = await S(T, R, Zr(D, R))), (T = _.document || T), typeof _.node != 'object')) {
            R = void 0;
            break;
          }
          (R = _.node[P]), (_.nodePointer = we(_.nodePointer, ze(P)));
        } else {
          R = void 0;
          break;
        }
      (_.node = R), (_.document = T);
      const k = fr(A.source.absoluteRef, v.$ref);
      return _.document && ye(R) && (_ = await S(_.document, R, Zr(D, R))), i.set(k, _), { ..._ };
    }
  }
}
const et = /^1\.0\.\d+(-.+)?$/,
  dr = ['oas2', 'oas3_0', 'oas3_1', 'oas3_2', 'async2', 'async3', 'arazzo1', 'overlay1'];
function Do(e) {
  return e === 'oas2'
    ? 'oas2'
    : e === 'async2'
    ? 'async2'
    : e === 'async3'
    ? 'async3'
    : e === 'arazzo1'
    ? 'arazzo1'
    : e === 'overlay1'
    ? 'overlay1'
    : 'oas3';
}
function Bt(e) {
  if (!Ee(e)) throw new Error(`Document must be JSON object, got ${typeof e}`);
  if (e.openapi && typeof e.openapi != 'string')
    throw new Error(`Invalid OpenAPI version: should be a string but got "${typeof e.openapi}"`);
  if (typeof e.openapi == 'string' && e.openapi.startsWith('3.0.')) return 'oas3_0';
  if (typeof e.openapi == 'string' && e.openapi.startsWith('3.1.')) return 'oas3_1';
  if (typeof e.openapi == 'string' && e.openapi.startsWith('3.2.')) return 'oas3_2';
  if (e.swagger && e.swagger === '2.0') return 'oas2';
  if (e.openapi || e.swagger)
    throw new Error(`Unsupported OpenAPI version: ${e.openapi || e.swagger}`);
  if (typeof e.asyncapi == 'string' && e.asyncapi.startsWith('2.')) return 'async2';
  if (typeof e.asyncapi == 'string' && e.asyncapi.startsWith('3.')) return 'async3';
  if (e.asyncapi) throw new Error(`Unsupported AsyncAPI version: ${e.asyncapi}`);
  if (typeof e.arazzo == 'string' && et.test(e.arazzo)) return 'arazzo1';
  if (typeof e.overlay == 'string' && et.test(e.overlay)) return 'overlay1';
  throw new Error('Unsupported specification');
}
const Mo = {
  Root: 'DefinitionRoot',
  ServerVariablesMap: 'ServerVariableMap',
  Paths: ['PathMap', 'PathsMap'],
  CallbacksMap: 'CallbackMap',
  MediaTypesMap: 'MediaTypeMap',
  ExamplesMap: 'ExampleMap',
  EncodingMap: 'EncodingsMap',
  HeadersMap: 'HeaderMap',
  LinksMap: 'LinkMap',
  OAuth2Flows: 'SecuritySchemeFlows',
  Responses: 'ResponsesMap',
};
function rt(e, r) {
  const t = {};
  t.any = {
    enter: [],
    leave: [],
  };
  for (const o of Object.keys(r))
    t[o] = {
      enter: [],
      leave: [],
    };
  t.ref = {
    enter: [],
    leave: [],
  };
  for (const { ruleId: o, severity: a, message: l, visitor: p } of e)
    n({ ruleId: o, severity: a, message: l }, p, null);
  for (const o of Object.keys(t))
    t[o].enter.sort((a, l) => l.depth - a.depth), t[o].leave.sort((a, l) => a.depth - l.depth);
  return t;
  function s(o, a, l, p, c = []) {
    if (c.includes(a)) return;
    c = [...c, a];
    const f = /* @__PURE__ */ new Set();
    for (const d of Object.values(a.properties)) {
      if (d === l) {
        u(o, c);
        continue;
      }
      typeof d == 'object' && d !== null && d.name && f.add(d);
    }
    a.additionalProperties &&
      typeof a.additionalProperties != 'function' &&
      (a.additionalProperties === l
        ? u(o, c)
        : a.additionalProperties.name !== void 0 && f.add(a.additionalProperties)),
      a.items &&
        typeof a.items != 'function' &&
        (a.items === l ? u(o, c) : a.items.name !== void 0 && f.add(a.items)),
      a.extensionsPrefix && f.add(Le);
    for (const d of Array.from(f.values())) s(o, d, l, p, c);
    function u(d, m) {
      for (const x of m.slice(1))
        (t[x.name] = t[x.name] || {
          enter: [],
          leave: [],
        }),
          t[x.name].enter.push({
            ...d,
            visit: () => {},
            depth: 0,
            context: {
              isSkippedLevel: !0,
              seen: /* @__PURE__ */ new Set(),
              parent: p,
            },
          });
    }
  }
  function i(o, a) {
    if (Array.isArray(a)) {
      const l = a.find((p) => o[p]) || void 0;
      return l && o[l];
    }
    return o[a];
  }
  function n(o, a, l, p = 0) {
    const c = Object.keys(r);
    if (p === 0) c.push('any'), c.push('ref');
    else {
      if (a.any) throw new Error('any() is allowed only on top level');
      if (a.ref) throw new Error('ref() is allowed only on top level');
    }
    for (const f of c) {
      const u = a[f] || i(a, Mo[f]),
        d = t[f];
      if (!u) continue;
      let m, x, S;
      const A = Ee(u);
      if (f === 'ref' && A && u.skip) throw new Error('ref() visitor does not support skip');
      typeof u == 'function' ? (m = u) : A && ((m = u.enter), (x = u.leave), (S = u.skip));
      const v = (m ? 1 : 0) + (x ? 1 : 0) + (S ? 1 : 0),
        D = A && Object.keys(u).length > v,
        U = {
          activatedOn: null,
          type: r[f],
          parent: l,
          isSkippedLevel: !1,
        };
      if ((D && n(o, u, U, p + 1), l && s(o, l.type, r[f], l), m || A)) {
        if (m && typeof m != 'function') throw new Error('DEV: should be function');
        d.enter.push({
          ...o,
          visit: m || (() => {}),
          skip: S,
          depth: p,
          context: U,
        });
      }
      if (x) {
        if (typeof x != 'function') throw new Error('DEV: should be function');
        d.leave.push({
          ...o,
          visit: x,
          depth: p,
          context: U,
        });
      }
    }
  }
}
function jt(e, r) {
  return e + '::' + r;
}
function tt(e, r) {
  return { prev: e, value: r };
}
function nt(e) {
  return e?.prev ?? null;
}
function Fo(e) {
  const r = {};
  for (; e.parent; ) (r[e.parent.type.name] = e.parent.activatedOn?.value.node), (e = e.parent);
  return r;
}
function Ho(e) {
  const r = {};
  for (; e.parent; )
    e.parent.activatedOn?.value.location &&
      (r[e.parent.type.name] = e.parent.activatedOn?.value.location),
      (e = e.parent);
  return r;
}
function it(e) {
  const { document: r, rootType: t, normalizedVisitors: s, resolvedRefMap: i, ctx: n } = e,
    o = {},
    a = /* @__PURE__ */ new Set();
  l(r.parsed, t, new Me(r.source, '#/'), void 0, '');
  function l(p, c, f, u, d) {
    const m = (_, R = S.source.absoluteRef) => {
        if (!ye(_)) return { location: f, node: _ };
        const q = jt(R, _.$ref),
          k = i.get(q);
        if (!k)
          return {
            location: void 0,
            node: void 0,
          };
        const { resolved: P, node: F, document: G, nodePointer: w, error: L } = k;
        return {
          location: P ? new Me(G.source, w) : L instanceof Be ? new Me(L.source, '') : void 0,
          node: F,
          error: L,
        };
      },
      x = f;
    let S = f;
    const { node: A, location: v, error: D } = m(p),
      U = /* @__PURE__ */ new Set();
    if (ye(p)) {
      const _ = s.ref.enter;
      for (const { visit: R, ruleId: q, severity: k, message: P, context: F } of _) {
        U.add(F);
        const G = Y.bind(void 0, q, k, P);
        R(
          p,
          {
            report: G,
            resolve: m,
            rawNode: p,
            rawLocation: x,
            location: f,
            type: c,
            parent: u,
            key: d,
            parentLocations: {},
            specVersion: n.specVersion,
            config: n.config,
            getVisitorData: T.bind(void 0, q),
          },
          { node: A, location: v, error: D }
        ),
          v?.source.absoluteRef && n.refTypes && n.refTypes.set(v?.source.absoluteRef, c);
      }
    }
    if (A !== void 0 && v && c.name !== 'scalar') {
      S = v;
      const _ = o[c.name]?.has?.(A);
      let R = !1;
      const k = s.any.enter.concat(s[c.name]?.enter || []),
        P = [];
      for (const { context: w, visit: L, skip: I, ruleId: W, severity: N, message: g } of k) {
        if (a.has(`${S.absolutePointer}${S.pointer}`)) break;
        if (w.isSkippedLevel)
          w.parent.activatedOn &&
            !w.parent.activatedOn.value.nextLevelTypeActivated &&
            !w.seen.has(p) &&
            (w.seen.add(p), (R = !0), P.push(w));
        else if (
          (w.parent && // if nested
            w.parent.activatedOn &&
            w.activatedOn?.value.withParentNode !== w.parent.activatedOn.value.node && // do not enter if visited by parent children (it works thanks because deeper visitors are sorted before)
            w.parent.activatedOn.value.nextLevelTypeActivated?.value !== c) ||
          (!w.parent && !_)
        ) {
          P.push(w);
          const X = {
            node: A,
            location: v,
            nextLevelTypeActivated: null,
            withParentNode: w.parent?.activatedOn?.value.node,
            skipped:
              (w.parent?.activatedOn?.value.skipped ||
                I?.(A, d, {
                  location: f,
                  rawLocation: x,
                  resolve: m,
                  rawNode: p,
                })) ??
              !1,
          };
          w.activatedOn = tt(w.activatedOn, X);
          let te = w.parent;
          for (; te; )
            (te.activatedOn.value.nextLevelTypeActivated = tt(
              te.activatedOn.value.nextLevelTypeActivated,
              c
            )),
              (te = te.parent);
          X.skipped || ((R = !0), U.add(w), M(L, A, p, w, W, N, g));
        }
      }
      if (R || !_) {
        if (
          ((o[c.name] = o[c.name] || /* @__PURE__ */ new Set()), o[c.name].add(A), Array.isArray(A))
        ) {
          const w = c.items;
          if (w !== void 0) {
            const L = typeof w == 'function';
            for (let I = 0; I < A.length; I++) {
              let W = L ? w(A[I], v.child([I]).absolutePointer) : w,
                N = A[I];
              W?.directResolveAs && ((W = W.directResolveAs), (N = { $ref: N })),
                ke(W) && l(N, W, v.child([I]), A, I);
            }
          }
        } else if (typeof A == 'object' && A !== null) {
          const w = Object.keys(c.properties);
          c.additionalProperties
            ? w.push(...Object.keys(A).filter((L) => !w.includes(L)))
            : c.extensionsPrefix &&
              w.push(...Object.keys(A).filter((L) => L.startsWith(c.extensionsPrefix))),
            ye(p) && w.push(...Object.keys(p).filter((L) => L !== '$ref' && !w.includes(L)));
          for (const L of w) {
            let I = A[L],
              W = v;
            I === void 0 && ((I = p[L]), (W = f));
            let N = pt(c.properties, L);
            N === void 0 && (N = c.additionalProperties),
              typeof N == 'function' && (N = N(I, L)),
              N === void 0 && c.extensionsPrefix && L.startsWith(c.extensionsPrefix) && (N = Le),
              !ke(N) && N?.directResolveAs && ((N = N.directResolveAs), (I = { $ref: I })),
              N &&
                N.name === void 0 &&
                N.resolvable !== !1 &&
                (N = { name: 'scalar', properties: {} }),
              !(!ke(N) || (N.name === 'scalar' && !ye(I))) && l(I, N, W.child([L]), A, L);
          }
        }
      }
      const F = s.any.leave,
        G = (s[c.name]?.leave || []).concat(F);
      for (const w of P.reverse())
        if (w.isSkippedLevel) w.seen.delete(A);
        else if (((w.activatedOn = nt(w.activatedOn)), w.parent)) {
          let L = w.parent;
          for (; L; )
            (L.activatedOn.value.nextLevelTypeActivated = nt(
              L.activatedOn.value.nextLevelTypeActivated
            )),
              (L = L.parent);
        }
      for (const { context: w, visit: L, ruleId: I, severity: W, message: N } of G)
        !w.isSkippedLevel && U.has(w) && M(L, A, p, w, I, W, N);
    }
    if (((S = f), ye(p))) {
      const _ = s.ref.leave;
      for (const { visit: R, ruleId: q, severity: k, context: P, message: F } of _)
        if (U.has(P)) {
          const G = Y.bind(void 0, q, k, F);
          R(
            p,
            {
              report: G,
              resolve: m,
              rawNode: p,
              rawLocation: x,
              location: f,
              type: c,
              parent: u,
              key: d,
              parentLocations: {},
              specVersion: n.specVersion,
              config: n.config,
              getVisitorData: T.bind(void 0, q),
            },
            { node: A, location: v, error: D }
          );
        }
    }
    function M(_, R, q, k, P, F, G) {
      const w = Y.bind(void 0, P, F, G);
      _(
        R,
        {
          report: w,
          resolve: m,
          rawNode: q,
          location: S,
          rawLocation: x,
          type: c,
          parent: u,
          key: d,
          parentLocations: Ho(k),
          specVersion: n.specVersion,
          config: n.config,
          ignoreNextVisitorsOnNode: () => {
            a.add(`${S.absolutePointer}${S.pointer}`);
          },
          getVisitorData: T.bind(void 0, P),
        },
        Fo(k),
        k
      );
    }
    function Y(_, R, q, k) {
      const F = (
          k.location
            ? Array.isArray(k.location)
              ? k.location
              : [k.location]
            : [{ ...S, reportOnKey: !1 }]
        ).map((w) => ({
          ...S,
          reportOnKey: !1,
          ...w,
        })),
        G = k.forceSeverity || R;
      G !== 'off' &&
        n.problems.push({
          ruleId: k.ruleId || _,
          severity: G,
          ...k,
          message: q ? q.replace('{{message}}', k.message) : k.message,
          suggest: k.suggest || [],
          location: F,
        });
    }
    function T(_) {
      return (n.visitorsData[_] = n.visitorsData[_] || {}), n.visitorsData[_];
    }
  }
}
function Uo(e) {
  return e !== void 0;
}
function ot(e, r, t, s) {
  return e
    .flatMap((i) =>
      Object.keys(i).map((n) => {
        const o = i[n],
          a =
            t === 'rules'
              ? r.getRuleSettings(n, s)
              : t === 'preprocessors'
              ? r.getPreprocessorSettings(n, s)
              : r.getDecoratorSettings(n, s);
        if (a.severity === 'off') return;
        const l = a.severity,
          p = a.message,
          c = o(a);
        return Array.isArray(c)
          ? c.map((f) => ({
              severity: l,
              ruleId: n,
              message: p,
              visitor: f,
            }))
          : {
              severity: l,
              message: p,
              ruleId: n,
              visitor: c,
              // note: actually it is only one visitor object
            };
      })
    )
    .flatMap((i) => i)
    .filter(Uo);
}
function Ar(e) {
  return Ee(e) && Object.keys(e).length === 0;
}
const qo = () => {
    const e = /* @__PURE__ */ new Map();
    function r(s, i, n) {
      e.set(s.absolutePointer, {
        usedIn: e.get(s.absolutePointer)?.usedIn ?? [],
        componentType: i,
        name: n,
      });
    }
    function t(s, i) {
      const n = i.length;
      for (const [o, { usedIn: a, name: l, componentType: p }] of e)
        !a.some(
          (f) =>
            !i.some(
              (u) =>
                // Check if the current location's absolute pointer starts with the 'removed' path
                // and either its length matches exactly with 'removed' or the character after the 'removed' path is a '/'
                f.absolutePointer.startsWith(u) &&
                (f.absolutePointer.length === u.length || f.absolutePointer[u.length] === '/')
            )
        ) &&
          p &&
          (i.push(o), delete s[p][l], e.delete(o), Ar(s[p]) && delete s[p]);
      return i.length > n ? t(s, i) : i.length;
    }
    return {
      ref: {
        leave(s, { location: i, type: n, resolve: o, key: a }) {
          if (['Schema', 'Parameter', 'Response', 'SecurityScheme'].includes(n.name)) {
            const l = o(s);
            if (!l.location) return;
            const [p, c] = l.location.absolutePointer.split('#', 2);
            if (!c) return;
            const f = c.split('/').slice(0, 3).join('/'),
              u = `${p}#${f}`,
              d = e.get(u);
            d
              ? d.usedIn.push(i)
              : e.set(u, {
                  usedIn: [i],
                  name: a.toString(),
                });
          }
        },
      },
      Root: {
        leave(s, i) {
          const n = i.getVisitorData();
          n.removedCount = t(s, []);
        },
      },
      NamedSchemas: {
        Schema(s, { location: i, key: n }) {
          s.allOf || r(i, 'definitions', n.toString());
        },
      },
      NamedParameters: {
        Parameter(s, { location: i, key: n }) {
          r(i, 'parameters', n.toString());
        },
      },
      NamedResponses: {
        Response(s, { location: i, key: n }) {
          r(i, 'responses', n.toString());
        },
      },
      NamedSecuritySchemes: {
        SecurityScheme(s, { location: i, key: n }) {
          r(i, 'securityDefinitions', n.toString());
        },
      },
    };
  },
  Bo = () => {
    const e = /* @__PURE__ */ new Map();
    function r(s, i, n) {
      e.set(s.absolutePointer, {
        usedIn: e.get(s.absolutePointer)?.usedIn ?? [],
        componentType: i,
        name: n,
      });
    }
    function t(s, i) {
      const n = i.length;
      for (const [o, { usedIn: a, name: l, componentType: p }] of e)
        if (
          !a.some(
            (f) =>
              !i.some(
                (u) =>
                  f.absolutePointer.startsWith(u) &&
                  (f.absolutePointer.length === u.length || f.absolutePointer[u.length] === '/')
              )
          ) &&
          p &&
          s.components
        ) {
          i.push(o);
          const f = s.components[p];
          delete f[l], e.delete(o), Ar(f) && delete s.components[p];
        }
      return i.length > n ? t(s, i) : i.length;
    }
    return {
      ref: {
        leave(s, { location: i, type: n, resolve: o, key: a }) {
          if (
            ['Schema', 'Header', 'Parameter', 'Response', 'Example', 'RequestBody'].includes(n.name)
          ) {
            const l = o(s);
            if (!l.location) return;
            const [p, c] = l.location.absolutePointer.split('#', 2);
            if (!c) return;
            const f = c.split('/').slice(0, 4).join('/'),
              u = `${p}#${f}`,
              d = e.get(u);
            d
              ? d.usedIn.push(i)
              : e.set(u, {
                  usedIn: [i],
                  name: a.toString(),
                });
          }
        },
      },
      Root: {
        leave(s, i) {
          const n = i.getVisitorData();
          (n.removedCount = t(s, [])), Ar(s.components) && delete s.components;
        },
      },
      NamedSchemas: {
        Schema(s, { location: i, key: n }) {
          s.allOf || r(i, 'schemas', n.toString());
        },
      },
      NamedParameters: {
        Parameter(s, { location: i, key: n }) {
          r(i, 'parameters', n.toString());
        },
      },
      NamedResponses: {
        Response(s, { location: i, key: n }) {
          r(i, 'responses', n.toString());
        },
      },
      NamedExamples: {
        Example(s, { location: i, key: n }) {
          r(i, 'examples', n.toString());
        },
      },
      NamedRequestBodies: {
        RequestBody(s, { location: i, key: n }) {
          r(i, 'requestBodies', n.toString());
        },
      },
      NamedHeaders: {
        Header(s, { location: i, key: n }) {
          r(i, 'headers', n.toString());
        },
      },
    };
  };
function mr(e, r, t) {
  const s = e.error;
  s instanceof Be &&
    r({
      message: 'Failed to parse: ' + s.message,
      location: {
        source: s.source,
        pointer: void 0,
        start: {
          col: s.col,
          line: s.line,
        },
      },
    });
  const i = e.error?.message;
  r({
    location: t,
    message: `Can't resolve $ref${i ? ': ' + i : ''}`,
  });
}
function br(e, r) {
  let t, s;
  if (e === r) return !0;
  if (e && r && (t = e.constructor) === r.constructor) {
    if (t === Date) return e.getTime() === r.getTime();
    if (t === RegExp) return e.toString() === r.toString();
    if (t === Array) {
      if ((s = e.length) === r.length) for (; s-- && br(e[s], r[s]); );
      return s === -1;
    }
    if (!t || typeof e == 'object') {
      s = 0;
      for (t in e)
        if (
          (Object.prototype.hasOwnProperty.call(e, t) &&
            ++s &&
            !Object.prototype.hasOwnProperty.call(r, t)) ||
          !(t in r) ||
          !br(e[t], r[t])
        )
          return !1;
      return Object.keys(r).length === s;
    }
  }
  return e !== e && r !== r;
}
function st(e, r) {
  switch (r) {
    case 'oas3':
      switch (e) {
        case 'Schema':
          return 'schemas';
        case 'Parameter':
          return 'parameters';
        case 'Response':
          return 'responses';
        case 'Example':
          return 'examples';
        case 'RequestBody':
          return 'requestBodies';
        case 'Header':
          return 'headers';
        case 'SecuritySchema':
          return 'securitySchemes';
        case 'Link':
          return 'links';
        case 'Callback':
          return 'callbacks';
        default:
          return null;
      }
    case 'oas2':
      switch (e) {
        case 'Schema':
          return 'definitions';
        case 'Parameter':
          return 'parameters';
        case 'Response':
          return 'responses';
        default:
          return null;
      }
    case 'async2':
      switch (e) {
        case 'Schema':
          return 'schemas';
        case 'Parameter':
          return 'parameters';
        default:
          return null;
      }
    case 'async3':
      switch (e) {
        case 'Schema':
          return 'schemas';
        case 'Parameter':
          return 'parameters';
        default:
          return null;
      }
    case 'arazzo1':
      switch (e) {
        case 'Root.workflows_items.parameters_items':
        case 'Root.workflows_items.steps_items.parameters_items':
          return 'parameters';
        default:
          return null;
      }
    case 'overlay1':
      return null;
  }
}
function jo(e, r, t, s, i) {
  let n, o;
  const a = {
    ref: {
      leave(u, d, m) {
        if (!m.location || m.node === void 0) {
          mr(m, d.report, d.location);
          return;
        }
        if (
          (m.location.source === t.source &&
            m.location.source === d.location.source &&
            d.type.name !== 'scalar' &&
            !r) ||
          (i && Te(u.$ref))
        )
          return;
        const x = st(d.type.name, e);
        x ? (r ? (p(x, m, d), Or(u, m, d)) : ((u.$ref = p(x, m, d)), l(u, m, d))) : Or(u, m, d);
      },
    },
    Example: {
      leave(u, d) {
        if (ct(u) && u.value === void 0) {
          const m = d.resolve({ $ref: u.externalValue });
          if (!m.location || m.node === void 0) {
            mr(m, d.report, d.location);
            return;
          }
          if (i && Te(u.externalValue)) return;
          (u.value = d.resolve({ $ref: u.externalValue }).node), delete u.externalValue;
        }
      },
    },
    Root: {
      enter(u, d) {
        (o = d.location),
          e === 'oas3'
            ? (n = u.components = u.components || {})
            : e === 'oas2'
            ? (n = u)
            : e === 'async2'
            ? (n = u.components = u.components || {})
            : e === 'async3'
            ? (n = u.components = u.components || {})
            : e === 'arazzo1' && (n = u.components = u.components || {});
      },
    },
  };
  e === 'oas3' &&
    (a.DiscriminatorMapping = {
      leave(u, d) {
        for (const m of Object.keys(u)) {
          const x = u[m],
            S = d.resolve({ $ref: x });
          if (!S.location || S.node === void 0) {
            mr(S, d.report, d.location.child(m));
            return;
          }
          const A = st('Schema', e);
          u[m] = p(A, S, d);
        }
      },
    });
  function l(u, d, m) {
    const x = jt(m.location.source.absoluteRef, u.$ref);
    s.set(x, {
      document: t,
      isRemote: !1,
      node: d.node,
      nodePointer: u.$ref,
      resolved: !0,
    });
  }
  function p(u, d, m) {
    n[u] = n[u] || {};
    const x = f(d, u, m);
    return (
      (n[u][x] = d.node),
      e === 'oas3' || e === 'async2' || e === 'async3' ? `#/components/${u}/${x}` : `#/${u}/${x}`
    );
  }
  function c(u, d, m) {
    return ye(u) &&
      m.resolve(u, o.absolutePointer).location?.absolutePointer === d.location.absolutePointer
      ? !0
      : br(u, d.node);
  }
  function f(u, d, m) {
    const [x, S] = [u.location.source.absoluteRef, u.location.pointer],
      A = n[d];
    let v = '';
    const D = S.slice(2).split('/').filter(ut);
    for (; D.length > 0; )
      if (((v = D.pop() + (v ? `-${v}` : '')), !A || !A[v] || c(A[v], u, m))) return v;
    if (((v = Wt(x) + (v ? `_${v}` : '')), !A[v] || c(A[v], u, m))) return v;
    const U = v;
    let M = 2;
    for (; A[v] && !c(A[v], u, m); ) (v = `${U}-${M}`), M++;
    return (
      A[v] ||
        m.report({
          message: `Two schemas are referenced with the same name but different content. Renamed ${U} to ${v}.`,
          location: m.location,
          forceSeverity: 'warn',
        }),
      v
    );
  }
  return a;
}
async function zo(e) {
  const {
      document: r,
      config: t,
      types: s,
      externalRefResolver: i,
      dereference: n = !1,
      removeUnusedComponents: o = !1,
      keepUrlRefs: a = !1,
    } = e,
    l = Bt(r.parsed),
    p = Do(l),
    c = t.getRulesForSpecVersion(p),
    f = Zt(t.extendTypes(s, l), t),
    u = ot(c, t, 'preprocessors', l),
    d = ot(c, t, 'decorators', l),
    m = {
      problems: [],
      specVersion: l,
      config: t,
      refTypes: /* @__PURE__ */ new Map(),
      visitorsData: {},
    };
  o &&
    !d.some((A) => A.ruleId === 'remove-unused-components') &&
    d.push({
      severity: 'error',
      ruleId: 'remove-unused-components',
      visitor: p === 'oas2' ? qo() : Bo(),
    });
  let x = await Jr({
    rootDocument: r,
    rootType: f.Root,
    externalRefResolver: i,
  });
  u.length > 0 &&
    (it({
      document: r,
      rootType: f.Root,
      normalizedVisitors: rt(u, f),
      resolvedRefMap: x,
      ctx: m,
    }),
    (x = await Jr({
      rootDocument: r,
      rootType: f.Root,
      externalRefResolver: i,
    })));
  const S = rt(
    [
      {
        severity: 'error',
        ruleId: 'bundler',
        visitor: jo(p, n, r, x, a),
      },
      ...d,
    ],
    f
  );
  return (
    it({
      document: r,
      rootType: f.Root,
      normalizedVisitors: S,
      resolvedRefMap: x,
      ctx: m,
    }),
    {
      bundle: r,
      problems: m.problems.map((A) => t.addProblemToIgnore(A)),
      fileDependencies: i.getFiles(),
      rootType: f.Root,
      refTypes: m.refTypes,
      visitorsData: m.visitorsData,
    }
  );
}
const Go = /^[0-9][0-9Xx]{2}$/,
  Vo = {
    properties: {
      swagger: { type: 'string' },
      info: 'Info',
      host: { type: 'string' },
      basePath: { type: 'string' },
      schemes: { type: 'array', items: { type: 'string' } },
      consumes: { type: 'array', items: { type: 'string' } },
      produces: { type: 'array', items: { type: 'string' } },
      paths: 'Paths',
      definitions: 'NamedSchemas',
      parameters: 'NamedParameters',
      responses: 'NamedResponses',
      securityDefinitions: 'NamedSecuritySchemes',
      security: 'SecurityRequirementList',
      tags: 'TagList',
      externalDocs: 'ExternalDocs',
      'x-servers': 'XServerList',
      'x-tagGroups': 'TagGroups',
      'x-ignoredHeaderParameters': { type: 'array', items: { type: 'string' } },
    },
    required: ['swagger', 'paths', 'info'],
    extensionsPrefix: 'x-',
  },
  Ko = {
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      termsOfService: { type: 'string' },
      contact: 'Contact',
      license: 'License',
      version: { type: 'string' },
      'x-logo': 'Logo',
    },
    required: ['title', 'version'],
    extensionsPrefix: 'x-',
  },
  Yo = {
    properties: {
      url: { type: 'string' },
      altText: { type: 'string' },
      backgroundColor: { type: 'string' },
      href: { type: 'string' },
    },
    extensionsPrefix: 'x-',
  },
  Wo = {
    properties: {
      name: { type: 'string' },
      url: { type: 'string' },
      email: { type: 'string' },
    },
    extensionsPrefix: 'x-',
  },
  Xo = {
    properties: {
      name: { type: 'string' },
      url: { type: 'string' },
    },
    required: ['name'],
    extensionsPrefix: 'x-',
  },
  Qo = {
    properties: {},
    additionalProperties: (e, r) => (r.startsWith('/') ? 'PathItem' : void 0),
  },
  Zo = {
    properties: {
      $ref: { type: 'string' },
      // TODO: verify special $ref handling for Path Item
      parameters: 'ParameterList',
      get: 'Operation',
      put: 'Operation',
      post: 'Operation',
      delete: 'Operation',
      options: 'Operation',
      head: 'Operation',
      patch: 'Operation',
    },
    extensionsPrefix: 'x-',
  },
  Jo = {
    properties: {
      tags: { type: 'array', items: { type: 'string' } },
      summary: { type: 'string' },
      description: { type: 'string' },
      externalDocs: 'ExternalDocs',
      operationId: { type: 'string' },
      consumes: { type: 'array', items: { type: 'string' } },
      produces: { type: 'array', items: { type: 'string' } },
      parameters: 'ParameterList',
      responses: 'Responses',
      schemes: { type: 'array', items: { type: 'string' } },
      deprecated: { type: 'boolean' },
      security: 'SecurityRequirementList',
      'x-codeSamples': 'XCodeSampleList',
      'x-code-samples': 'XCodeSampleList',
      // deprecated
      'x-hideTryItPanel': { type: 'boolean' },
    },
    required: ['responses'],
    extensionsPrefix: 'x-',
  },
  es = {
    properties: {
      lang: { type: 'string' },
      label: { type: 'string' },
      source: { type: 'string' },
    },
  },
  rs = {
    properties: {
      url: { type: 'string' },
      description: { type: 'string' },
    },
    required: ['url'],
  },
  ts = {
    properties: {
      description: { type: 'string' },
      url: { type: 'string' },
    },
    required: ['url'],
    extensionsPrefix: 'x-',
  },
  ns = {
    properties: {
      name: { type: 'string' },
      in: { type: 'string', enum: ['query', 'header', 'path', 'formData', 'body'] },
      description: { type: 'string' },
      required: { type: 'boolean' },
      schema: 'Schema',
      type: { type: 'string', enum: ['string', 'number', 'integer', 'boolean', 'array', 'file'] },
      format: { type: 'string' },
      allowEmptyValue: { type: 'boolean' },
      items: 'ParameterItems',
      collectionFormat: { type: 'string', enum: ['csv', 'ssv', 'tsv', 'pipes', 'multi'] },
      default: null,
      maximum: { type: 'integer' },
      exclusiveMaximum: { type: 'boolean' },
      minimum: { type: 'integer' },
      exclusiveMinimum: { type: 'boolean' },
      maxLength: { type: 'integer' },
      minLength: { type: 'integer' },
      pattern: { type: 'string' },
      maxItems: { type: 'integer' },
      minItems: { type: 'integer' },
      uniqueItems: { type: 'boolean' },
      enum: { type: 'array' },
      multipleOf: { type: 'number' },
      'x-example': {},
      // any
      'x-examples': 'ExamplesMap',
    },
    required(e) {
      return !e || !e.in
        ? ['name', 'in']
        : e.in === 'body'
        ? ['name', 'in', 'schema']
        : e.type === 'array'
        ? ['name', 'in', 'type', 'items']
        : ['name', 'in', 'type'];
    },
    extensionsPrefix: 'x-',
  },
  is = {
    properties: {
      type: { type: 'string', enum: ['string', 'number', 'integer', 'boolean', 'array'] },
      format: { type: 'string' },
      items: 'ParameterItems',
      collectionFormat: { type: 'string', enum: ['csv', 'ssv', 'tsv', 'pipes', 'multi'] },
      default: null,
      maximum: { type: 'integer' },
      exclusiveMaximum: { type: 'boolean' },
      minimum: { type: 'integer' },
      exclusiveMinimum: { type: 'boolean' },
      maxLength: { type: 'integer' },
      minLength: { type: 'integer' },
      pattern: { type: 'string' },
      maxItems: { type: 'integer' },
      minItems: { type: 'integer' },
      uniqueItems: { type: 'boolean' },
      enum: { type: 'array' },
      multipleOf: { type: 'number' },
    },
    required(e) {
      return e && e.type === 'array' ? ['type', 'items'] : ['type'];
    },
    extensionsPrefix: 'x-',
  },
  os = {
    properties: {
      default: 'Response',
    },
    additionalProperties: (e, r) => (Go.test(r) ? 'Response' : void 0),
  },
  ss = {
    properties: {
      description: { type: 'string' },
      schema: 'Schema',
      headers: z('Header'),
      examples: 'Examples',
      'x-summary': { type: 'string' },
    },
    required: ['description'],
    extensionsPrefix: 'x-',
  },
  as = {
    properties: {},
    additionalProperties: { isExample: !0 },
  },
  ls = {
    properties: {
      description: { type: 'string' },
      type: { type: 'string', enum: ['string', 'number', 'integer', 'boolean', 'array'] },
      format: { type: 'string' },
      items: 'ParameterItems',
      collectionFormat: { type: 'string', enum: ['csv', 'ssv', 'tsv', 'pipes', 'multi'] },
      default: null,
      maximum: { type: 'integer' },
      exclusiveMaximum: { type: 'boolean' },
      minimum: { type: 'integer' },
      exclusiveMinimum: { type: 'boolean' },
      maxLength: { type: 'integer' },
      minLength: { type: 'integer' },
      pattern: { type: 'string' },
      maxItems: { type: 'integer' },
      minItems: { type: 'integer' },
      uniqueItems: { type: 'boolean' },
      enum: { type: 'array' },
      multipleOf: { type: 'number' },
    },
    required(e) {
      return e && e.type === 'array' ? ['type', 'items'] : ['type'];
    },
    extensionsPrefix: 'x-',
  },
  us = {
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
      externalDocs: 'ExternalDocs',
      'x-traitTag': { type: 'boolean' },
      'x-displayName': { type: 'string' },
    },
    required: ['name'],
    extensionsPrefix: 'x-',
  },
  cs = {
    properties: {
      name: { type: 'string' },
      tags: { type: 'array', items: { type: 'string' } },
    },
  },
  ps = {
    properties: {
      format: { type: 'string' },
      title: { type: 'string' },
      description: { type: 'string' },
      default: null,
      multipleOf: { type: 'number' },
      maximum: { type: 'number' },
      minimum: { type: 'number' },
      exclusiveMaximum: { type: 'boolean' },
      exclusiveMinimum: { type: 'boolean' },
      maxLength: { type: 'number' },
      minLength: { type: 'number' },
      pattern: { type: 'string' },
      maxItems: { type: 'number' },
      minItems: { type: 'number' },
      uniqueItems: { type: 'boolean' },
      maxProperties: { type: 'number' },
      minProperties: { type: 'number' },
      required: { type: 'array', items: { type: 'string' } },
      enum: { type: 'array' },
      type: {
        type: 'string',
        enum: ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'],
      },
      items: (e) => (Array.isArray(e) ? K('Schema') : 'Schema'),
      allOf: K('Schema'),
      properties: 'SchemaProperties',
      additionalProperties: (e) => (typeof e == 'boolean' ? { type: 'boolean' } : 'Schema'),
      discriminator: { type: 'string' },
      readOnly: { type: 'boolean' },
      xml: 'Xml',
      externalDocs: 'ExternalDocs',
      example: { isExample: !0 },
      'x-tags': { type: 'array', items: { type: 'string' } },
      'x-nullable': { type: 'boolean' },
      'x-extendedDiscriminator': { type: 'string' },
      'x-additionalPropertiesName': { type: 'string' },
      'x-explicitMappingOnly': { type: 'boolean' },
      'x-enumDescriptions': 'EnumDescriptions',
    },
    extensionsPrefix: 'x-',
  },
  fs = {
    properties: {},
    additionalProperties: { type: 'string' },
  },
  ds = {
    properties: {},
    additionalProperties: 'Schema',
  },
  ms = {
    properties: {
      name: { type: 'string' },
      namespace: { type: 'string' },
      prefix: { type: 'string' },
      attribute: { type: 'boolean' },
      wrapped: { type: 'boolean' },
    },
    extensionsPrefix: 'x-',
  },
  hs = {
    properties: {
      type: { enum: ['basic', 'apiKey', 'oauth2'] },
      description: { type: 'string' },
      name: { type: 'string' },
      in: { type: 'string', enum: ['query', 'header'] },
      flow: { enum: ['implicit', 'password', 'application', 'accessCode'] },
      authorizationUrl: { type: 'string' },
      tokenUrl: { type: 'string' },
      scopes: { type: 'object', additionalProperties: { type: 'string' } },
      'x-defaultClientId': { type: 'string' },
    },
    required(e) {
      switch (e?.type) {
        case 'apiKey':
          return ['type', 'name', 'in'];
        case 'oauth2':
          switch (e?.flow) {
            case 'implicit':
              return ['type', 'flow', 'authorizationUrl', 'scopes'];
            case 'accessCode':
              return ['type', 'flow', 'authorizationUrl', 'tokenUrl', 'scopes'];
            case 'application':
            case 'password':
              return ['type', 'flow', 'tokenUrl', 'scopes'];
            default:
              return ['type', 'flow', 'scopes'];
          }
        default:
          return ['type'];
      }
    },
    allowed(e) {
      switch (e?.type) {
        case 'basic':
          return ['type', 'description'];
        case 'apiKey':
          return ['type', 'name', 'in', 'description'];
        case 'oauth2':
          switch (e?.flow) {
            case 'implicit':
              return ['type', 'flow', 'authorizationUrl', 'description', 'scopes'];
            case 'accessCode':
              return ['type', 'flow', 'authorizationUrl', 'tokenUrl', 'description', 'scopes'];
            case 'application':
            case 'password':
              return ['type', 'flow', 'tokenUrl', 'description', 'scopes'];
            default:
              return ['type', 'flow', 'tokenUrl', 'authorizationUrl', 'description', 'scopes'];
          }
        default:
          return ['type', 'description'];
      }
    },
    extensionsPrefix: 'x-',
  },
  ys = {
    properties: {},
    additionalProperties: { type: 'array', items: { type: 'string' } },
  },
  gs = {
    properties: {
      value: { isExample: !0 },
      summary: { type: 'string' },
      description: { type: 'string' },
      externalValue: { type: 'string' },
    },
    extensionsPrefix: 'x-',
  },
  xs = {
    Root: Vo,
    Tag: us,
    TagList: K('Tag'),
    TagGroups: K('TagGroup'),
    TagGroup: cs,
    ExternalDocs: ts,
    Example: gs,
    ExamplesMap: z('Example'),
    EnumDescriptions: fs,
    SecurityRequirement: ys,
    SecurityRequirementList: K('SecurityRequirement'),
    Info: Ko,
    Contact: Wo,
    License: Xo,
    Logo: Yo,
    Paths: Qo,
    PathItem: Zo,
    Parameter: ns,
    ParameterItems: is,
    ParameterList: K('Parameter'),
    Operation: Jo,
    Examples: as,
    Header: ls,
    Responses: os,
    Response: ss,
    Schema: ps,
    Xml: ms,
    SchemaProperties: ds,
    NamedSchemas: z('Schema'),
    NamedResponses: z('Response'),
    NamedParameters: z('Parameter'),
    NamedSecuritySchemes: z('SecurityScheme'),
    SecurityScheme: hs,
    XCodeSample: es,
    XCodeSampleList: K('XCodeSample'),
    XServerList: K('XServer'),
    XServer: rs,
  },
  vs = /^[0-9][0-9Xx]{2}$/,
  As = {
    properties: {
      openapi: null,
      info: 'Info',
      servers: 'ServerList',
      security: 'SecurityRequirementList',
      tags: 'TagList',
      externalDocs: 'ExternalDocs',
      paths: 'Paths',
      components: 'Components',
      'x-webhooks': 'WebhooksMap',
      'x-tagGroups': 'TagGroups',
      'x-ignoredHeaderParameters': { type: 'array', items: { type: 'string' } },
    },
    required: ['openapi', 'paths', 'info'],
    extensionsPrefix: 'x-',
  },
  bs = {
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
      externalDocs: 'ExternalDocs',
      'x-traitTag': { type: 'boolean' },
      'x-displayName': { type: 'string' },
    },
    required: ['name'],
    extensionsPrefix: 'x-',
  },
  Ss = {
    properties: {
      name: { type: 'string' },
      tags: { type: 'array', items: { type: 'string' } },
    },
    extensionsPrefix: 'x-',
  },
  Rs = {
    properties: {
      description: { type: 'string' },
      url: { type: 'string' },
    },
    required: ['url'],
    extensionsPrefix: 'x-',
  },
  Es = {
    properties: {
      url: { type: 'string' },
      description: { type: 'string' },
      variables: 'ServerVariablesMap',
    },
    required: ['url'],
    extensionsPrefix: 'x-',
  },
  _s = {
    properties: {
      enum: {
        type: 'array',
        items: { type: 'string' },
      },
      default: { type: 'string' },
      description: { type: 'string' },
    },
    required: ['default'],
    extensionsPrefix: 'x-',
  },
  ws = {
    properties: {},
    additionalProperties: { type: 'array', items: { type: 'string' } },
  },
  Cs = {
    properties: {
      title: { type: 'string' },
      version: { type: 'string' },
      description: { type: 'string' },
      termsOfService: { type: 'string' },
      contact: 'Contact',
      license: 'License',
      'x-logo': 'Logo',
    },
    required: ['title', 'version'],
    extensionsPrefix: 'x-',
  },
  Ps = {
    properties: {
      url: { type: 'string' },
      altText: { type: 'string' },
      backgroundColor: { type: 'string' },
      href: { type: 'string' },
    },
  },
  Os = {
    properties: {
      name: { type: 'string' },
      url: { type: 'string' },
      email: { type: 'string' },
    },
    extensionsPrefix: 'x-',
  },
  Ts = {
    properties: {
      name: { type: 'string' },
      url: { type: 'string' },
    },
    required: ['name'],
    extensionsPrefix: 'x-',
  },
  Ls = {
    properties: {},
    additionalProperties: (e, r) => (r.startsWith('/') ? 'PathItem' : void 0),
  },
  ks = {
    properties: {},
    additionalProperties: () => 'PathItem',
  },
  Is = {
    properties: {
      $ref: { type: 'string' },
      // TODO: verify special $ref handling for Path Item
      servers: 'ServerList',
      parameters: 'ParameterList',
      summary: { type: 'string' },
      description: { type: 'string' },
      get: 'Operation',
      put: 'Operation',
      post: 'Operation',
      delete: 'Operation',
      options: 'Operation',
      head: 'Operation',
      patch: 'Operation',
      trace: 'Operation',
    },
    extensionsPrefix: 'x-',
  },
  $s = {
    properties: {
      name: { type: 'string' },
      in: { enum: ['query', 'header', 'path', 'cookie'] },
      description: { type: 'string' },
      required: { type: 'boolean' },
      deprecated: { type: 'boolean' },
      allowEmptyValue: { type: 'boolean' },
      style: {
        enum: [
          'form',
          'simple',
          'label',
          'matrix',
          'spaceDelimited',
          'pipeDelimited',
          'deepObject',
        ],
      },
      explode: { type: 'boolean' },
      allowReserved: { type: 'boolean' },
      schema: 'Schema',
      example: { isExample: !0 },
      examples: 'ExamplesMap',
      content: 'MediaTypesMap',
    },
    required: ['name', 'in'],
    requiredOneOf: ['schema', 'content'],
    extensionsPrefix: 'x-',
  },
  Ns = {
    properties: {
      tags: {
        type: 'array',
        items: { type: 'string' },
      },
      summary: { type: 'string' },
      description: { type: 'string' },
      externalDocs: 'ExternalDocs',
      operationId: { type: 'string' },
      parameters: 'ParameterList',
      security: 'SecurityRequirementList',
      servers: 'ServerList',
      requestBody: 'RequestBody',
      responses: 'Responses',
      deprecated: { type: 'boolean' },
      callbacks: 'CallbacksMap',
      'x-codeSamples': 'XCodeSampleList',
      'x-code-samples': 'XCodeSampleList',
      // deprecated
      'x-hideTryItPanel': { type: 'boolean' },
    },
    required: ['responses'],
    extensionsPrefix: 'x-',
  },
  Ds = {
    properties: {
      lang: { type: 'string' },
      label: { type: 'string' },
      source: { type: 'string' },
    },
  },
  Ms = {
    properties: {
      description: { type: 'string' },
      required: { type: 'boolean' },
      content: 'MediaTypesMap',
    },
    required: ['content'],
    extensionsPrefix: 'x-',
  },
  Fs = {
    properties: {},
    additionalProperties: 'MediaType',
  },
  Hs = {
    properties: {
      schema: 'Schema',
      example: { isExample: !0 },
      examples: 'ExamplesMap',
      encoding: 'EncodingMap',
    },
    extensionsPrefix: 'x-',
  },
  Us = {
    properties: {
      value: { isExample: !0 },
      summary: { type: 'string' },
      description: { type: 'string' },
      externalValue: { type: 'string' },
    },
    extensionsPrefix: 'x-',
  },
  qs = {
    properties: {
      contentType: { type: 'string' },
      headers: 'HeadersMap',
      style: {
        enum: [
          'form',
          'simple',
          'label',
          'matrix',
          'spaceDelimited',
          'pipeDelimited',
          'deepObject',
        ],
      },
      explode: { type: 'boolean' },
      allowReserved: { type: 'boolean' },
    },
    extensionsPrefix: 'x-',
  },
  Bs = {
    properties: {},
    additionalProperties: { type: 'string' },
  },
  js = {
    properties: {
      description: { type: 'string' },
      required: { type: 'boolean' },
      deprecated: { type: 'boolean' },
      allowEmptyValue: { type: 'boolean' },
      style: {
        enum: [
          'form',
          'simple',
          'label',
          'matrix',
          'spaceDelimited',
          'pipeDelimited',
          'deepObject',
        ],
      },
      explode: { type: 'boolean' },
      allowReserved: { type: 'boolean' },
      schema: 'Schema',
      example: { isExample: !0 },
      examples: 'ExamplesMap',
      content: 'MediaTypesMap',
    },
    requiredOneOf: ['schema', 'content'],
    extensionsPrefix: 'x-',
  },
  zs = {
    properties: { default: 'Response' },
    additionalProperties: (e, r) => (vs.test(r) ? 'Response' : void 0),
  },
  Gs = {
    properties: {
      description: { type: 'string' },
      headers: 'HeadersMap',
      content: 'MediaTypesMap',
      links: 'LinksMap',
      'x-summary': { type: 'string' },
    },
    required: ['description'],
    extensionsPrefix: 'x-',
  },
  Vs = {
    properties: {
      operationRef: { type: 'string' },
      operationId: { type: 'string' },
      parameters: null,
      // TODO: figure out how to describe/validate this
      requestBody: null,
      // TODO: figure out how to describe/validate this
      description: { type: 'string' },
      server: 'Server',
    },
    extensionsPrefix: 'x-',
  },
  Ks = {
    properties: {
      externalDocs: 'ExternalDocs',
      discriminator: 'Discriminator',
      title: { type: 'string' },
      multipleOf: { type: 'number', minimum: 0 },
      maximum: { type: 'number' },
      minimum: { type: 'number' },
      exclusiveMaximum: { type: 'boolean' },
      exclusiveMinimum: { type: 'boolean' },
      maxLength: { type: 'integer', minimum: 0 },
      minLength: { type: 'integer', minimum: 0 },
      pattern: { type: 'string' },
      maxItems: { type: 'integer', minimum: 0 },
      minItems: { type: 'integer', minimum: 0 },
      uniqueItems: { type: 'boolean' },
      maxProperties: { type: 'integer', minimum: 0 },
      minProperties: { type: 'integer', minimum: 0 },
      required: { type: 'array', items: { type: 'string' } },
      enum: { type: 'array' },
      type: {
        enum: ['object', 'array', 'string', 'number', 'integer', 'boolean'],
      },
      allOf: K('Schema'),
      anyOf: K('Schema'),
      oneOf: K('Schema'),
      not: 'Schema',
      properties: 'SchemaProperties',
      items: (e) => (Array.isArray(e) ? K('Schema') : 'Schema'),
      additionalProperties: (e) => (typeof e == 'boolean' ? { type: 'boolean' } : 'Schema'),
      description: { type: 'string' },
      format: { type: 'string' },
      default: null,
      nullable: { type: 'boolean' },
      readOnly: { type: 'boolean' },
      writeOnly: { type: 'boolean' },
      xml: 'Xml',
      example: { isExample: !0 },
      deprecated: { type: 'boolean' },
      'x-tags': { type: 'array', items: { type: 'string' } },
      'x-additionalPropertiesName': { type: 'string' },
      'x-explicitMappingOnly': { type: 'boolean' },
    },
    extensionsPrefix: 'x-',
  },
  Ys = {
    properties: {
      name: { type: 'string' },
      namespace: { type: 'string' },
      prefix: { type: 'string' },
      attribute: { type: 'boolean' },
      wrapped: { type: 'boolean' },
    },
    extensionsPrefix: 'x-',
  },
  Ws = {
    properties: {},
    additionalProperties: 'Schema',
  },
  Xs = {
    properties: {},
    additionalProperties: (e) =>
      Xt(e) ? { type: 'string', directResolveAs: 'Schema' } : { type: 'string' },
  },
  Qs = {
    properties: {
      propertyName: { type: 'string' },
      mapping: 'DiscriminatorMapping',
    },
    required: ['propertyName'],
    extensionsPrefix: 'x-',
  },
  Zs = {
    properties: {
      parameters: 'NamedParameters',
      schemas: 'NamedSchemas',
      responses: 'NamedResponses',
      examples: 'NamedExamples',
      requestBodies: 'NamedRequestBodies',
      headers: 'NamedHeaders',
      securitySchemes: 'NamedSecuritySchemes',
      links: 'NamedLinks',
      callbacks: 'NamedCallbacks',
    },
    extensionsPrefix: 'x-',
  },
  Js = {
    properties: {
      refreshUrl: { type: 'string' },
      scopes: { type: 'object', additionalProperties: { type: 'string' } },
      // TODO: validate scopes
      authorizationUrl: { type: 'string' },
    },
    required: ['authorizationUrl', 'scopes'],
    extensionsPrefix: 'x-',
  },
  ea = {
    properties: {
      refreshUrl: { type: 'string' },
      scopes: { type: 'object', additionalProperties: { type: 'string' } },
      // TODO: validate scopes
      tokenUrl: { type: 'string' },
    },
    required: ['tokenUrl', 'scopes'],
    extensionsPrefix: 'x-',
  },
  ra = {
    properties: {
      refreshUrl: { type: 'string' },
      scopes: { type: 'object', additionalProperties: { type: 'string' } },
      // TODO: validate scopes
      tokenUrl: { type: 'string' },
    },
    required: ['tokenUrl', 'scopes'],
    extensionsPrefix: 'x-',
  },
  ta = {
    properties: {
      refreshUrl: { type: 'string' },
      authorizationUrl: { type: 'string' },
      scopes: { type: 'object', additionalProperties: { type: 'string' } },
      // TODO: validate scopes
      tokenUrl: { type: 'string' },
      'x-usePkce': (e) => (typeof e == 'boolean' ? { type: 'boolean' } : 'XUsePkce'),
    },
    required: ['authorizationUrl', 'tokenUrl', 'scopes'],
    extensionsPrefix: 'x-',
  },
  na = {
    properties: {
      implicit: 'ImplicitFlow',
      password: 'PasswordFlow',
      clientCredentials: 'ClientCredentials',
      authorizationCode: 'AuthorizationCode',
    },
    extensionsPrefix: 'x-',
  },
  ia = {
    properties: {
      type: { enum: ['apiKey', 'http', 'oauth2', 'openIdConnect'] },
      description: { type: 'string' },
      name: { type: 'string' },
      in: { type: 'string', enum: ['query', 'header', 'cookie'] },
      scheme: { type: 'string' },
      bearerFormat: { type: 'string' },
      flows: 'OAuth2Flows',
      openIdConnectUrl: { type: 'string' },
      'x-defaultClientId': { type: 'string' },
    },
    required(e) {
      switch (e?.type) {
        case 'apiKey':
          return ['type', 'name', 'in'];
        case 'http':
          return ['type', 'scheme'];
        case 'oauth2':
          return ['type', 'flows'];
        case 'openIdConnect':
          return ['type', 'openIdConnectUrl'];
        default:
          return ['type'];
      }
    },
    allowed(e) {
      switch (e?.type) {
        case 'apiKey':
          return ['type', 'name', 'in', 'description'];
        case 'http':
          return ['type', 'scheme', 'bearerFormat', 'description'];
        case 'oauth2':
          return ['type', 'flows', 'description'];
        case 'openIdConnect':
          return ['type', 'openIdConnectUrl', 'description'];
        default:
          return ['type', 'description'];
      }
    },
    extensionsPrefix: 'x-',
  },
  oa = {
    properties: {
      disableManualConfiguration: { type: 'boolean' },
      hideClientSecretInput: { type: 'boolean' },
    },
  },
  Qe = {
    Root: As,
    Tag: bs,
    TagList: K('Tag'),
    TagGroups: K('TagGroup'),
    TagGroup: Ss,
    ExternalDocs: Rs,
    Server: Es,
    ServerList: K('Server'),
    ServerVariable: _s,
    ServerVariablesMap: z('ServerVariable'),
    SecurityRequirement: ws,
    SecurityRequirementList: K('SecurityRequirement'),
    Info: Cs,
    Contact: Os,
    License: Ts,
    Paths: Ls,
    PathItem: Is,
    Parameter: $s,
    ParameterList: K('Parameter'),
    Operation: Ns,
    Callback: z('PathItem'),
    CallbacksMap: z('Callback'),
    RequestBody: Ms,
    MediaTypesMap: Fs,
    MediaType: Hs,
    Example: Us,
    ExamplesMap: z('Example'),
    Encoding: qs,
    EncodingMap: z('Encoding'),
    EnumDescriptions: Bs,
    Header: js,
    HeadersMap: z('Header'),
    Responses: zs,
    Response: Gs,
    Link: Vs,
    Logo: Ps,
    Schema: Ks,
    Xml: Ys,
    SchemaProperties: Ws,
    DiscriminatorMapping: Xs,
    Discriminator: Qs,
    Components: Zs,
    LinksMap: z('Link'),
    NamedSchemas: z('Schema'),
    NamedResponses: z('Response'),
    NamedParameters: z('Parameter'),
    NamedExamples: z('Example'),
    NamedRequestBodies: z('RequestBody'),
    NamedHeaders: z('Header'),
    NamedSecuritySchemes: z('SecurityScheme'),
    NamedLinks: z('Link'),
    NamedCallbacks: z('Callback'),
    ImplicitFlow: Js,
    PasswordFlow: ea,
    ClientCredentials: ra,
    AuthorizationCode: ta,
    OAuth2Flows: na,
    SecurityScheme: ia,
    XCodeSample: Ds,
    XCodeSampleList: K('XCodeSample'),
    XUsePkce: oa,
    WebhooksMap: ks,
  },
  sa = {
    properties: {
      openapi: null,
      info: 'Info',
      servers: 'ServerList',
      security: 'SecurityRequirementList',
      tags: 'TagList',
      externalDocs: 'ExternalDocs',
      paths: 'Paths',
      webhooks: 'WebhooksMap',
      components: 'Components',
      jsonSchemaDialect: { type: 'string' },
    },
    required: ['openapi', 'info'],
    requiredOneOf: ['paths', 'components', 'webhooks'],
    extensionsPrefix: 'x-',
  },
  aa = {
    properties: {
      name: { type: 'string' },
      url: { type: 'string' },
      identifier: { type: 'string' },
    },
    required: ['name'],
    extensionsPrefix: 'x-',
  },
  la = {
    properties: {
      title: { type: 'string' },
      version: { type: 'string' },
      description: { type: 'string' },
      termsOfService: { type: 'string' },
      summary: { type: 'string' },
      contact: 'Contact',
      license: 'License',
      'x-logo': 'Logo',
    },
    required: ['title', 'version'],
    extensionsPrefix: 'x-',
  },
  ua = {
    properties: {
      parameters: 'NamedParameters',
      schemas: 'NamedSchemas',
      responses: 'NamedResponses',
      examples: 'NamedExamples',
      requestBodies: 'NamedRequestBodies',
      headers: 'NamedHeaders',
      securitySchemes: 'NamedSecuritySchemes',
      links: 'NamedLinks',
      callbacks: 'NamedCallbacks',
      pathItems: 'NamedPathItems',
    },
    extensionsPrefix: 'x-',
  },
  ca = {
    properties: {
      tags: {
        type: 'array',
        items: { type: 'string' },
      },
      summary: { type: 'string' },
      description: { type: 'string' },
      externalDocs: 'ExternalDocs',
      operationId: { type: 'string' },
      parameters: 'ParameterList',
      security: 'SecurityRequirementList',
      servers: 'ServerList',
      requestBody: 'RequestBody',
      responses: 'Responses',
      deprecated: { type: 'boolean' },
      callbacks: 'CallbacksMap',
      'x-codeSamples': 'XCodeSampleList',
      'x-code-samples': 'XCodeSampleList',
      // deprecated
      'x-hideTryItPanel': { type: 'boolean' },
    },
    extensionsPrefix: 'x-',
  },
  pa = {
    properties: {
      $id: { type: 'string' },
      $anchor: { type: 'string' },
      id: { type: 'string' },
      $schema: { type: 'string' },
      definitions: 'NamedSchemas',
      $defs: 'NamedSchemas',
      $vocabulary: { type: 'string' },
      externalDocs: 'ExternalDocs',
      discriminator: 'Discriminator',
      title: { type: 'string' },
      multipleOf: { type: 'number', minimum: 0 },
      maximum: { type: 'number' },
      minimum: { type: 'number' },
      exclusiveMaximum: { type: 'number' },
      exclusiveMinimum: { type: 'number' },
      maxLength: { type: 'integer', minimum: 0 },
      minLength: { type: 'integer', minimum: 0 },
      pattern: { type: 'string' },
      maxItems: { type: 'integer', minimum: 0 },
      minItems: { type: 'integer', minimum: 0 },
      uniqueItems: { type: 'boolean' },
      maxProperties: { type: 'integer', minimum: 0 },
      minProperties: { type: 'integer', minimum: 0 },
      required: { type: 'array', items: { type: 'string' } },
      enum: { type: 'array' },
      type: (e) =>
        Array.isArray(e)
          ? {
              type: 'array',
              items: {
                enum: ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'],
              },
            }
          : {
              enum: ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'],
            },
      allOf: K('Schema'),
      anyOf: K('Schema'),
      oneOf: K('Schema'),
      not: 'Schema',
      if: 'Schema',
      then: 'Schema',
      else: 'Schema',
      dependentSchemas: z('Schema'),
      dependentRequired: 'DependentRequired',
      prefixItems: K('Schema'),
      contains: 'Schema',
      minContains: { type: 'integer', minimum: 0 },
      maxContains: { type: 'integer', minimum: 0 },
      patternProperties: 'PatternProperties',
      propertyNames: 'Schema',
      unevaluatedItems: (e) => (typeof e == 'boolean' ? { type: 'boolean' } : 'Schema'),
      unevaluatedProperties: (e) => (typeof e == 'boolean' ? { type: 'boolean' } : 'Schema'),
      summary: { type: 'string' },
      properties: 'SchemaProperties',
      items: (e) => (typeof e == 'boolean' ? { type: 'boolean' } : 'Schema'),
      additionalProperties: (e) => (typeof e == 'boolean' ? { type: 'boolean' } : 'Schema'),
      description: { type: 'string' },
      format: { type: 'string' },
      contentEncoding: { type: 'string' },
      contentMediaType: { type: 'string' },
      contentSchema: 'Schema',
      default: null,
      readOnly: { type: 'boolean' },
      writeOnly: { type: 'boolean' },
      xml: 'Xml',
      examples: { type: 'array' },
      example: { isExample: !0 },
      deprecated: { type: 'boolean' },
      const: null,
      $comment: { type: 'string' },
      'x-tags': { type: 'array', items: { type: 'string' } },
      $dynamicAnchor: { type: 'string' },
      $dynamicRef: { type: 'string' },
    },
    extensionsPrefix: 'x-',
  },
  at = {
    properties: {},
    additionalProperties: (e) => (typeof e == 'boolean' ? { type: 'boolean' } : 'Schema'),
  },
  fa = {
    properties: {
      type: { enum: ['apiKey', 'http', 'oauth2', 'openIdConnect', 'mutualTLS'] },
      description: { type: 'string' },
      name: { type: 'string' },
      in: { type: 'string', enum: ['query', 'header', 'cookie'] },
      scheme: { type: 'string' },
      bearerFormat: { type: 'string' },
      flows: 'OAuth2Flows',
      openIdConnectUrl: { type: 'string' },
    },
    required(e) {
      switch (e?.type) {
        case 'apiKey':
          return ['type', 'name', 'in'];
        case 'http':
          return ['type', 'scheme'];
        case 'oauth2':
          return ['type', 'flows'];
        case 'openIdConnect':
          return ['type', 'openIdConnectUrl'];
        default:
          return ['type'];
      }
    },
    allowed(e) {
      switch (e?.type) {
        case 'apiKey':
          return ['type', 'name', 'in', 'description'];
        case 'http':
          return ['type', 'scheme', 'bearerFormat', 'description'];
        case 'oauth2':
          switch (e?.flows) {
            case 'implicit':
              return ['type', 'flows', 'authorizationUrl', 'refreshUrl', 'description', 'scopes'];
            case 'password':
            case 'clientCredentials':
              return ['type', 'flows', 'tokenUrl', 'refreshUrl', 'description', 'scopes'];
            case 'authorizationCode':
              return [
                'type',
                'flows',
                'authorizationUrl',
                'refreshUrl',
                'tokenUrl',
                'description',
                'scopes',
              ];
            default:
              return [
                'type',
                'flows',
                'authorizationUrl',
                'refreshUrl',
                'tokenUrl',
                'description',
                'scopes',
              ];
          }
        case 'openIdConnect':
          return ['type', 'openIdConnectUrl', 'description'];
        case 'mutualTLS':
          return ['type', 'description'];
        default:
          return ['type', 'description'];
      }
    },
    extensionsPrefix: 'x-',
  },
  da = {
    properties: {},
    additionalProperties: { type: 'array', items: { type: 'string' } },
  },
  Q = {
    ...Qe,
    Info: la,
    Root: sa,
    Schema: pa,
    SchemaProperties: at,
    PatternProperties: at,
    License: aa,
    Components: ua,
    NamedPathItems: z('PathItem'),
    SecurityScheme: fa,
    Operation: ca,
    DependentRequired: da,
  },
  ma = {
    ...Q.Root,
    properties: {
      ...Q.Root.properties,
      $self: { type: 'string' },
    },
  },
  ha = {
    ...Q.Tag,
    properties: {
      ...Q.Tag.properties,
      kind: { type: 'string' },
      parent: { type: 'string' },
      summary: { type: 'string' },
    },
  },
  ya = {
    ...Q.Server,
    properties: {
      ...Q.Server.properties,
      name: { type: 'string' },
    },
  },
  ga = {
    ...Q.SecurityScheme,
    properties: {
      ...Q.SecurityScheme.properties,
      deprecated: { type: 'boolean' },
      // added in OAS 3.2
      oauth2MetadataUrl: { type: 'string' },
      // added in OAS 3.2
    },
    allowed(e) {
      switch (e?.type) {
        case 'apiKey':
          return [
            'type',
            'name',
            'in',
            'description',
            'deprecated',
            // added in OAS 3.2
          ];
        case 'http':
          return [
            'type',
            'scheme',
            'bearerFormat',
            'description',
            'deprecated',
            // added in OAS 3.2
          ];
        case 'oauth2':
          switch (e?.flows) {
            case 'implicit':
              return [
                'type',
                'flows',
                'authorizationUrl',
                'refreshUrl',
                'description',
                'scopes',
                'oauth2MetadataUrl',
                // added in OAS 3.2
                'deprecated',
                // added in OAS 3.2
              ];
            case 'password':
            case 'clientCredentials':
              return [
                'type',
                'flows',
                'tokenUrl',
                'refreshUrl',
                'description',
                'scopes',
                'oauth2MetadataUrl',
                // added in OAS 3.2
                'deprecated',
                // added in OAS 3.2
              ];
            case 'authorizationCode':
              return [
                'type',
                'flows',
                'authorizationUrl',
                'refreshUrl',
                'tokenUrl',
                'description',
                'scopes',
                'oauth2MetadataUrl',
                // added in OAS 3.2
                'deprecated',
                // added in OAS 3.2
              ];
            case 'deviceAuthorization':
              return ['type', 'flows', 'deviceAuthorizationUrl', 'tokenUrl'];
            default:
              return [
                'type',
                'flows',
                'authorizationUrl',
                'refreshUrl',
                'tokenUrl',
                'description',
                'scopes',
                'oauth2MetadataUrl',
                // added in OAS 3.2
                'deprecated',
                // added in OAS 3.2
              ];
          }
        case 'openIdConnect':
          return [
            'type',
            'openIdConnectUrl',
            'description',
            'deprecated',
            // added in OAS 3.2
          ];
        case 'mutualTLS':
          return [
            'type',
            'description',
            'deprecated',
            // added in OAS 3.2
          ];
        default:
          return [
            'type',
            'description',
            'deprecated',
            // added in OAS 3.2
          ];
      }
    },
  },
  xa = {
    ...Q.OAuth2Flows,
    properties: {
      ...Q.OAuth2Flows.properties,
      deviceAuthorization: 'DeviceAuthorization',
    },
  },
  va = {
    properties: {
      deviceAuthorizationUrl: { type: 'string' },
      tokenUrl: { type: 'string' },
      refreshUrl: { type: 'string' },
      scopes: z('string'),
    },
    required: ['deviceAuthorizationUrl', 'tokenUrl', 'scopes'],
    extensionsPrefix: 'x-',
  },
  Aa = {
    ...Qe.PathItem,
    properties: {
      ...Qe.PathItem.properties,
      query: 'Operation',
      additionalOperations: z('Operation'),
    },
  },
  ba = {
    ...Q.Parameter,
    properties: {
      ...Q.Parameter.properties,
      in: { enum: ['query', 'header', 'path', 'cookie', 'querystring'] },
    },
  },
  Sa = {
    ...Q.Response,
    properties: {
      ...Q.Response.properties,
      summary: { type: 'string' },
    },
  },
  Ra = {
    ...Q.MediaType,
    properties: {
      ...Q.MediaType.properties,
      itemSchema: 'Schema',
      prefixEncodingList: K('Encoding'),
      itemEncoding: 'Encoding',
    },
  },
  Ea = {
    ...Q.Discriminator,
    properties: {
      ...Q.Discriminator.properties,
      defaultMapping: { type: 'string' },
    },
  },
  _a = {
    ...Q.Example,
    properties: {
      ...Q.Example.properties,
      dataValue: { isExample: !0 },
      serializedValue: { type: 'string' },
    },
  },
  wa = {
    ...Q,
    Root: ma,
    Tag: ha,
    Server: ya,
    SecurityScheme: ga,
    OAuth2Flows: xa,
    DeviceAuthorization: va,
    PathItem: Aa,
    Parameter: ba,
    Response: Sa,
    MediaType: Ra,
    Discriminator: Ea,
    Example: _a,
  };
function Ca(e) {
  return /^\\\\\?\\/.test(e) ? e : e.replace(/\\/g, '/');
}
function zt(e) {
  return (me.extname(e) === '.yaml' || me.extname(e) === '.yml') && !1;
}
function Pa(e) {
  return {
    http: {
      headers: e?.http?.headers ?? [],
      customFetch: void 0,
    },
  };
}
function Oa(e) {
  return (r, t, s) => e.call(null, r, t, s);
}
function Ta(e, r) {
  if (!e.rules) return {};
  const t = {},
    s = [];
  for (const [i, n] of Object.entries(e.rules))
    if (i.startsWith('rule/') && typeof n == 'object' && n !== null) {
      const o = n;
      if (r) {
        lt(r, o);
        for (const a of o.where || []) lt(r, a);
      }
      s.push({
        ...o,
        assertionId: i,
      });
    } else t[i] = n;
  return s.length > 0 && (t.assertions = s), t;
}
function lt(e, r) {
  for (const t of Object.keys(r.assertions || {})) {
    const [s, i] = t.split('/');
    if (!s || !i) continue;
    const n = e.find((o) => o.id === s);
    if (!n) throw Error(`Plugin ${s} isn't found.`);
    if (!n.assertions || !n.assertions[i])
      throw Error(`Plugin ${s} doesn't export assertions function with name ${i}.`);
    Oa(n.assertions[i]);
  }
}
const Ge = '.redocly.lint-ignore.yaml',
  La = `# This file instructs Redocly's linter to ignore the rules contained for specific parts of your API.
# See https://redocly.com/docs/cli/ for more information.
`;
function ka(e) {
  return e
    ? zt(e)
      ? me.join(me.dirname(e), Ge)
      : me.join(e, Ge)
    : ft
    ? void 0
    : me.join(process.cwd(), Ge);
}
class Cr {
  constructor(r, t = {}) {
    (this.ignore = {}),
      (this._usedRules = /* @__PURE__ */ new Set()),
      (this._usedVersions = /* @__PURE__ */ new Set()),
      (this.resolvedConfig = r),
      (this.configPath = t.configPath),
      (this.document = t.document),
      (this.resolvedRefMap = t.resolvedRefMap),
      (this.resolve = Pa(this.resolvedConfig.resolve)),
      (this._alias = t.alias),
      (this.plugins = t.plugins || []),
      (this.doNotResolveExamples = !!r.resolve?.doNotResolveExamples);
    const s = (i) => Ta({ rules: i }, this.plugins);
    (this.rules = {
      oas2: s({ ...r.rules, ...r.oas2Rules }),
      oas3_0: s({ ...r.rules, ...r.oas3_0Rules }),
      oas3_1: s({ ...r.rules, ...r.oas3_1Rules }),
      oas3_2: s({ ...r.rules, ...r.oas3_2Rules }),
      async2: s({ ...r.rules, ...r.async2Rules }),
      async3: s({ ...r.rules, ...r.async3Rules }),
      arazzo1: s({ ...r.rules, ...r.arazzo1Rules }),
      overlay1: s({ ...r.rules, ...r.overlay1Rules }),
    }),
      (this.preprocessors = {
        oas2: { ...r.preprocessors, ...r.oas2Preprocessors },
        oas3_0: {
          ...r.preprocessors,
          ...r.oas3_0Preprocessors,
        },
        oas3_1: {
          ...r.preprocessors,
          ...r.oas3_1Preprocessors,
        },
        oas3_2: {
          ...r.preprocessors,
          ...r.oas3_2Preprocessors,
        },
        async2: {
          ...r.preprocessors,
          ...r.async2Preprocessors,
        },
        async3: {
          ...r.preprocessors,
          ...r.async3Preprocessors,
        },
        arazzo1: {
          ...r.preprocessors,
          ...r.arazzo1Preprocessors,
        },
        overlay1: {
          ...r.preprocessors,
          ...r.overlay1Preprocessors,
        },
      }),
      (this.decorators = {
        oas2: { ...r.decorators, ...r.oas2Decorators },
        oas3_0: { ...r.decorators, ...r.oas3_0Decorators },
        oas3_1: { ...r.decorators, ...r.oas3_1Decorators },
        oas3_2: { ...r.decorators, ...r.oas3_2Decorators },
        async2: { ...r.decorators, ...r.async2Decorators },
        async3: { ...r.decorators, ...r.async3Decorators },
        arazzo1: { ...r.decorators, ...r.arazzo1Decorators },
        overlay1: {
          ...r.decorators,
          ...r.overlay1Decorators,
        },
      }),
      this.resolveIgnore(ka(t.configPath));
  }
  forAlias(r) {
    if (r === void 0 || !Ee(this.resolvedConfig?.apis?.[r])) return this;
    const { apis: t, ...s } = this.resolvedConfig,
      { root: i, output: n, ...o } = t[r];
    return new Cr(
      { ...s, ...o },
      {
        configPath: this.configPath,
        document: this.document,
        resolvedRefMap: this.resolvedRefMap,
        alias: r,
        plugins: this.plugins,
      }
    );
  }
  resolveIgnore(r) {
    !r || zt(r);
  }
  saveIgnore() {
    const r = this.configPath ? me.dirname(this.configPath) : process.cwd(),
      t = me.join(r, Ge),
      s = {};
    for (const i of Object.keys(this.ignore)) {
      const n = Te(i) ? i : Ca(me.relative(r, i)),
        o = (s[n] = this.ignore[i]);
      for (const a of Object.keys(o)) o[a] = Array.from(o[a]);
    }
    (void 0)(t, La + To(s));
  }
  addIgnore(r) {
    const t = this.ignore,
      s = r.location[0];
    if (s.pointer === void 0) return;
    const i = (t[s.source.absoluteRef] = t[s.source.absoluteRef] || {});
    (i[r.ruleId] = i[r.ruleId] || /* @__PURE__ */ new Set()).add(s.pointer);
  }
  addProblemToIgnore(r) {
    const t = r.location[0];
    if (t.pointer === void 0) return r;
    const i = (this.ignore[t.source.absoluteRef] || {})[r.ruleId],
      n = i && i.has(t.pointer);
    return n
      ? {
          ...r,
          ignored: n,
        }
      : r;
  }
  extendTypes(r, t) {
    let s = r;
    for (const i of this.plugins)
      if (i.typeExtension !== void 0)
        switch (t) {
          case 'oas3_0':
          case 'oas3_1':
          case 'oas3_2':
            if (!i.typeExtension.oas3) continue;
            s = i.typeExtension.oas3(s, t);
            break;
          case 'oas2':
            if (!i.typeExtension.oas2) continue;
            s = i.typeExtension.oas2(s, t);
            break;
          case 'async2':
            if (!i.typeExtension.async2) continue;
            s = i.typeExtension.async2(s, t);
            break;
          case 'async3':
            if (!i.typeExtension.async3) continue;
            s = i.typeExtension.async3(s, t);
            break;
          case 'arazzo1':
            if (!i.typeExtension.arazzo1) continue;
            s = i.typeExtension.arazzo1(s, t);
            break;
          case 'overlay1':
            if (!i.typeExtension.overlay1) continue;
            s = i.typeExtension.overlay1(s, t);
            break;
          default:
            throw new Error('Not implemented');
        }
    return s;
  }
  getRuleSettings(r, t) {
    this._usedRules.add(r), this._usedVersions.add(t);
    const s = this.rules[t][r] || 'off';
    return typeof s == 'string'
      ? {
          severity: s,
        }
      : { severity: 'error', ...s };
  }
  getPreprocessorSettings(r, t) {
    this._usedRules.add(r), this._usedVersions.add(t);
    const s = this.preprocessors[t][r] || 'off';
    return typeof s == 'string'
      ? {
          severity: s === 'on' ? 'error' : s,
        }
      : { severity: 'error', ...s };
  }
  getDecoratorSettings(r, t) {
    this._usedRules.add(r), this._usedVersions.add(t);
    const s = this.decorators[t][r] || 'off';
    return typeof s == 'string'
      ? {
          severity: s === 'on' ? 'error' : s,
        }
      : { severity: 'error', ...s };
  }
  getUnusedRules() {
    const r = [],
      t = [],
      s = [];
    for (const i of Array.from(this._usedVersions))
      r.push(...Object.keys(this.rules[i]).filter((n) => !this._usedRules.has(n))),
        t.push(...Object.keys(this.decorators[i]).filter((n) => !this._usedRules.has(n))),
        s.push(...Object.keys(this.preprocessors[i]).filter((n) => !this._usedRules.has(n)));
    return {
      rules: r,
      preprocessors: s,
      decorators: t,
    };
  }
  // TODO: add default case for redocly.yaml
  getRulesForSpecVersion(r) {
    switch (r) {
      case 'oas3':
        const t = [];
        return (
          this.plugins.forEach((l) => l.preprocessors?.oas3 && t.push(l.preprocessors.oas3)),
          this.plugins.forEach((l) => l.rules?.oas3 && t.push(l.rules.oas3)),
          this.plugins.forEach((l) => l.decorators?.oas3 && t.push(l.decorators.oas3)),
          t
        );
      case 'oas2':
        const s = [];
        return (
          this.plugins.forEach((l) => l.preprocessors?.oas2 && s.push(l.preprocessors.oas2)),
          this.plugins.forEach((l) => l.rules?.oas2 && s.push(l.rules.oas2)),
          this.plugins.forEach((l) => l.decorators?.oas2 && s.push(l.decorators.oas2)),
          s
        );
      case 'async2':
        const i = [];
        return (
          this.plugins.forEach((l) => l.preprocessors?.async2 && i.push(l.preprocessors.async2)),
          this.plugins.forEach((l) => l.rules?.async2 && i.push(l.rules.async2)),
          this.plugins.forEach((l) => l.decorators?.async2 && i.push(l.decorators.async2)),
          i
        );
      case 'async3':
        const n = [];
        return (
          this.plugins.forEach((l) => l.preprocessors?.async3 && n.push(l.preprocessors.async3)),
          this.plugins.forEach((l) => l.rules?.async3 && n.push(l.rules.async3)),
          this.plugins.forEach((l) => l.decorators?.async3 && n.push(l.decorators.async3)),
          n
        );
      case 'arazzo1':
        const o = [];
        return (
          this.plugins.forEach((l) => l.preprocessors?.arazzo1 && o.push(l.preprocessors.arazzo1)),
          this.plugins.forEach((l) => l.rules?.arazzo1 && o.push(l.rules.arazzo1)),
          this.plugins.forEach((l) => l.decorators?.arazzo1 && o.push(l.decorators.arazzo1)),
          o
        );
      case 'overlay1':
        const a = [];
        return (
          this.plugins.forEach(
            (l) => l.preprocessors?.overlay1 && a.push(l.preprocessors.overlay1)
          ),
          this.plugins.forEach((l) => l.rules?.overlay1 && a.push(l.rules.overlay1)),
          this.plugins.forEach((l) => l.decorators?.overlay1 && a.push(l.decorators.overlay1)),
          a
        );
    }
  }
  skipRules(r) {
    for (const t of r || [])
      for (const s of dr)
        if (this.rules[s][t]) this.rules[s][t] = 'off';
        else if (Array.isArray(this.rules[s].assertions))
          for (const i of this.rules[s].assertions) i.assertionId === t && (i.severity = 'off');
  }
  skipPreprocessors(r) {
    for (const t of r || [])
      for (const s of dr) this.preprocessors[s][t] && (this.preprocessors[s][t] = 'off');
  }
  skipDecorators(r) {
    for (const t of r || [])
      for (const s of dr) this.decorators[s][t] && (this.decorators[s][t] = 'off');
  }
}
async function Ia(e) {
  const { ref: r, doc: t, externalRefResolver: s = new Io(e.config.resolve), base: i = null } = e;
  if (!(r || t))
    throw new Error(`Document or reference is required.
`);
  const n = t === void 0 ? await s.resolveDocument(i, r, !0) : t;
  if (n instanceof Error) throw n;
  e.collectSpecData?.(n.parsed);
  const o = Bt(n.parsed);
  let a;
  switch (o) {
    case 'oas2':
      a = xs;
      break;
    case 'oas3_0':
      a = Qe;
      break;
    case 'oas3_1':
      a = Q;
      break;
    case 'oas3_2':
      a = wa;
      break;
    default:
      throw new Error(`Unsupported OpenAPI version: ${o}`);
  }
  return zo({
    document: n,
    ...e,
    externalRefResolver: s,
    types: a,
  });
}
function $a(e) {
  return new Cr(
    {
      rules: {},
      preprocessors: {},
      decorators: {},
      plugins: [],
    },
    {
      configPath: e.configPath,
    }
  );
}
const Na = await Ia({
  ref: 'test.yaml',
  config: await $a({}),
});
console.log(Na);
