/**
 * Built-in JSON Schema for Realm page front matter, selected with
 * `schema: realm` in a `front-matter` mapping.
 *
 * SOURCES (checked 2026-08-26):
 *   - docs/realm/config/front-matter-config.md — the published reference,
 *     which lists the front-matter-only options and the options that
 *     override `redocly.yaml`.
 *   - The Realm portal source, which reads `keywords`, `redirects`,
 *     `metadata`, `title`, and `description` from front matter. These are
 *     documented on their own pages rather than in the reference table.
 *
 * SCOPE: this validates the TYPE of each known key, not the inner shape of
 * the option objects. `seo`, `markdown`, `search`, and their siblings are
 * whole configuration blocks that Realm evolves independently; encoding
 * their structure here would drift silently and start rejecting valid
 * pages. Type-level checking still catches what actually goes wrong in
 * front matter: a misspelled key (with `strict`), and a value of the wrong
 * kind (`excludeFromSearch: "true"`, `slug: 42`).
 *
 * NOT STRICT BY DEFAULT: pages may carry arbitrary project data, and
 * Markdoc templates read it back through `$frontmatter.<key>` (Redocly's
 * own docs use `products` and `plans` this way on 268 pages). Opt into
 * `strict: true` to close the schema, and extend it with your own keys if
 * you use custom front matter.
 */
export const REALM_FRONT_MATTER_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    // -- Front matter-only options --
    excludeFromSearch: { type: 'boolean' },
    // `{ path }` is the current form; a bare string still works, and Realm
    // logs a deprecation warning naming the file. `false` is deliberately
    // NOT accepted: Realm reads this key as `if (frontmatter?.sidebar)`,
    // so a falsy value is indistinguishable from omitting the key. It does
    // not hide the sidebar, and flagging it surfaces that silent no-op.
    sidebar: {
      anyOf: [{ type: 'object' }, { type: 'string' }],
    },
    slug: {
      anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    },
    template: { type: 'string' },

    // -- Options that override redocly.yaml --
    banner: { type: 'array' },
    breadcrumbs: { type: 'object' },
    codeSnippet: { type: 'object' },
    colorMode: { type: 'object' },
    feedback: { type: 'object' },
    footer: { type: 'object' },
    markdown: { type: 'object' },
    // Front matter also accepts the front-matter-only `page` and `label`
    // keys here, alongside the shared navigation options.
    navigation: { type: 'object' },
    navbar: { type: 'object' },
    // Team-to-role map: every value is a role name.
    rbac: { type: 'object', additionalProperties: { type: 'string' } },
    search: { type: 'object' },
    seo: { type: 'object' },
    versionPicker: { type: 'object' },

    // -- Read by Realm, documented outside the reference table --
    keywords: { type: 'object' },
    redirects: { type: 'object' },
    metadata: { type: 'object' },
    // React pages (`*.page.tsx`) fall back to these for their search entry,
    // after `search.title`/`seo.title`. Markdown pages read `seo` instead
    // and ignore them, so they are permitted rather than documented as
    // Markdown page options.
    title: { type: 'string' },
    description: { type: 'string' },
  },
};
