/**
 * JSON Schema for Realm page front matter, selected with `schema: realm` in a
 * `front-matter` mapping.
 *
 * It only checks the type of each known key, not the shape of option objects like
 * `seo` or `search`, because Realm changes those independently.
 *
 * Unknown keys are allowed by default, since pages can carry custom data that
 * Markdoc reads through `$frontmatter.<key>`. Set `strict: true` to reject them.
 */
export const REALM_FRONT_MATTER_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    // -- Front matter-only options --
    excludeFromSearch: { type: 'boolean' },
    // `{ path }` is the current form. A bare string still works but is deprecated.
    // `false` is not accepted on purpose: Realm ignores falsy values, so it
    // does not hide the sidebar.
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
    // Front matter also accepts `page` and `label` here.
    navigation: { type: 'object' },
    navbar: { type: 'object' },
    // Maps team names to role names.
    rbac: { type: 'object', additionalProperties: { type: 'string' } },
    search: { type: 'object' },
    seo: { type: 'object' },
    versionPicker: { type: 'object' },

    // -- Read by Realm, documented outside the reference table --
    keywords: { type: 'object' },
    redirects: { type: 'object' },
    metadata: { type: 'object' },
    // Only React pages (`*.page.tsx`) use these, as a fallback for their search entry.
    title: { type: 'string' },
    description: { type: 'string' },
  },
};
