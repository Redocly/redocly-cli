// Generated file -- do not hand-edit. Regenerate with
// the generator script in the Redocly monorepo after packages/theme's or packages/portal's
// tag maps, or @markdoc/markdoc's built-in tags, change.
//
// The built-in `realm` schema: a statics-only view of the COMPOSED Markdoc
// configuration Realm registers, from three sources in Realm's own precedence
// order -- `@markdoc/markdoc`'s built-in tags, overridden by
// `packages/portal`'s, overridden in turn by `packages/theme`'s tag map. That
// order is why `partial.selfClosing` below is `true` even though theme's
// partial.ts never restates it: theme spreads markdoc's built-in `partial` and
// overrides only its `file` attribute. NOT included: a project's own custom
// tags, and `schemaDefinition`, which Realm registers inline in its markdoc
// options rather than in the tag module this generator imports
// (`markdoc-unknown-tag` carries it as a known exception).
//
// Only statically checkable facts survive: `selfClosing`, attribute names,
// primitive types, `required`, `default`, and Markdoc's `matches` (renamed
// `enum`, coerced to strings). Tags with a `validate()`, class-typed
// attributes, and a non-array `matches` are marked `dynamic: true` rather than
// guessed at.
//
// The drift test reads whatever `packages/theme/lib/` currently holds, so it
// cannot catch a STALE theme build -- the generator refuses to run against one
// instead (see `assertThemeBuildIsFresh`). `packages/portal`'s tags come
// straight from TypeScript source, always fresh.

import type { MarkdocSchema } from '../parser/markdoc/schema.js';

export const MARKDOC_REALM_SCHEMA: MarkdocSchema = {
  tags: {
    accordion: {
      attributes: {
        expanded: {
          type: 'boolean',
          default: false,
        },
        title: {
          type: 'string',
          required: true,
        },
      },
    },
    'accordion-group': {},
    admonition: {
      attributes: {
        name: {
          type: 'string',
        },
        type: {
          type: 'string',
          required: true,
          default: 'info',
          enum: ['warning', 'info', 'danger', 'success', 'idea'],
        },
      },
    },
    card: {
      attributes: {
        align: {
          type: 'string',
          default: 'start',
          enum: ['start', 'center', 'end'],
        },
        badge: {
          type: 'string',
        },
        badgeColor: {
          type: 'string',
        },
        badgeIcon: {
          type: 'string',
        },
        badgeIconRawContent: {
          type: 'string',
        },
        cta: {
          type: 'string',
        },
        icon: {
          type: 'string',
        },
        iconColor: {
          type: 'string',
        },
        iconPosition: {
          type: 'string',
          default: 'auto',
          enum: ['auto', 'start', 'center', 'end'],
        },
        iconRawContent: {
          type: 'string',
        },
        iconVariant: {
          type: 'string',
          enum: ['filled', 'ghost'],
        },
        image: {
          type: 'string',
        },
        imagePosition: {
          type: 'string',
          default: 'start',
          enum: ['start', 'end'],
        },
        layout: {
          type: 'string',
          default: 'vertical',
          enum: ['horizontal', 'combined', 'vertical'],
        },
        lineClamp: {
          type: 'number',
        },
        linkIcon: {
          type: 'string',
          enum: ['arrow', 'chevron'],
        },
        title: {
          type: 'string',
          required: true,
        },
        to: {
          type: 'string',
        },
        variant: {
          type: 'string',
          default: 'filled',
          enum: ['filled', 'outlined', 'elevated', 'ghost'],
        },
      },
    },
    cards: {
      attributes: {
        cardMinWidth: {
          type: 'number',
          default: 240,
        },
        columns: {
          type: 'number',
          default: 3,
        },
      },
    },
    'code-group': {
      attributes: {
        mode: {
          type: 'string',
          default: 'tabs',
          enum: ['tabs', 'dropdown'],
        },
      },
    },
    'code-snippet': {
      selfClosing: true,
      attributes: {
        after: {
          type: 'string',
          dynamic: true,
        },
        before: {
          type: 'string',
          dynamic: true,
        },
        file: {
          type: 'string',
          required: true,
          dynamic: true,
        },
        from: {
          type: 'string',
          dynamic: true,
        },
        language: {
          type: 'string',
          dynamic: true,
        },
        prefix: {
          type: 'string',
          dynamic: true,
        },
        rawContent: {
          type: 'string',
          dynamic: true,
        },
        title: {
          type: 'string',
          dynamic: true,
        },
        to: {
          type: 'string',
          dynamic: true,
        },
        wrap: {
          type: 'boolean',
          dynamic: true,
        },
      },
    },
    'code-walkthrough': {
      attributes: {
        __idx: {
          type: 'number',
          dynamic: true,
        },
        filesets: {
          type: 'string',
          required: true,
          dynamic: true,
        },
        filters: {
          type: 'string',
          dynamic: true,
        },
        inputs: {
          type: 'string',
          dynamic: true,
        },
        resolvedFilesets: {
          type: 'string',
          dynamic: true,
        },
        toggles: {
          type: 'string',
          dynamic: true,
        },
      },
    },
    'connect-mcp': {
      selfClosing: true,
      attributes: {
        alignment: {
          type: 'string',
          default: 'start',
          enum: ['start', 'end'],
        },
        options: {
          type: 'string',
          dynamic: true,
        },
        placement: {
          type: 'string',
          default: 'bottom',
          enum: ['top', 'bottom'],
        },
      },
    },
    debug: {
      attributes: {
        value: {
          type: 'string',
          dynamic: true,
        },
      },
    },
    diagram: {
      selfClosing: true,
      attributes: {
        align: {
          type: 'string',
          enum: ['left', 'center', 'right'],
          dynamic: true,
        },
        file: {
          type: 'string',
          required: true,
          dynamic: true,
        },
        rawContent: {
          type: 'string',
          dynamic: true,
        },
        type: {
          type: 'string',
          required: true,
          enum: ['mermaid', 'plantuml', 'excalidraw'],
          dynamic: true,
        },
        width: {
          type: 'string',
          dynamic: true,
        },
      },
    },
    else: {
      selfClosing: true,
      attributes: {
        primary: {
          type: 'string',
          dynamic: true,
        },
      },
    },
    html: {
      attributes: {
        attrs: {
          type: 'string',
          dynamic: true,
        },
        name: {
          type: 'string',
          required: true,
        },
      },
    },
    icon: {
      selfClosing: true,
      attributes: {
        color: {
          type: 'string',
          default: 'currentColor',
        },
        name: {
          type: 'string',
          required: true,
        },
        size: {
          type: 'string',
          default: '1em',
        },
      },
    },
    if: {
      attributes: {
        primary: {
          type: 'string',
          dynamic: true,
        },
      },
    },
    img: {
      selfClosing: true,
      attributes: {
        align: {
          type: 'string',
          enum: ['left', 'right', 'center', 'justify', 'initial', 'inherit'],
          dynamic: true,
        },
        alt: {
          type: 'string',
          dynamic: true,
        },
        border: {
          type: 'string',
          dynamic: true,
        },
        caption: {
          type: 'string',
          dynamic: true,
        },
        className: {
          type: 'string',
          dynamic: true,
        },
        framed: {
          type: 'boolean',
          default: false,
          dynamic: true,
        },
        height: {
          type: 'string',
          dynamic: true,
        },
        images: {
          type: 'string',
          dynamic: true,
        },
        lightboxStyle: {
          type: 'string',
          dynamic: true,
        },
        src: {
          type: 'string',
          dynamic: true,
        },
        srcSet: {
          type: 'string',
          dynamic: true,
        },
        style: {
          type: 'string',
          dynamic: true,
        },
        width: {
          type: 'string',
          dynamic: true,
        },
        withLightbox: {
          type: 'boolean',
          default: false,
          dynamic: true,
        },
      },
    },
    'inline-svg': {
      selfClosing: true,
      attributes: {
        file: {
          type: 'string',
          required: true,
          dynamic: true,
        },
        fileRawContent: {
          type: 'string',
        },
      },
    },
    input: {
      selfClosing: true,
      attributes: {
        id: {
          type: 'string',
          required: true,
        },
        label: {
          type: 'string',
        },
        placeholder: {
          type: 'string',
        },
        unless: {
          type: 'string',
          dynamic: true,
        },
        value: {
          type: 'string',
        },
        when: {
          type: 'string',
          dynamic: true,
        },
      },
    },
    'json-example': {
      selfClosing: true,
      attributes: {
        mode: {
          type: 'string',
          enum: ['read', 'write'],
          dynamic: true,
        },
        schema: {
          type: 'string',
          dynamic: true,
        },
        schemaResolved: {
          type: 'string',
          dynamic: true,
        },
        schemaResolvedErrors: {
          type: 'string',
          dynamic: true,
        },
        title: {
          type: 'string',
          dynamic: true,
        },
        value: {
          type: 'string',
          dynamic: true,
        },
        valueResolved: {
          type: 'string',
          dynamic: true,
        },
        valueResolvedErrors: {
          type: 'string',
          dynamic: true,
        },
      },
    },
    'json-schema': {
      selfClosing: true,
      attributes: {
        options: {
          type: 'string',
          dynamic: true,
        },
        schema: {
          type: 'string',
          dynamic: true,
        },
        schemaResolved: {
          type: 'string',
          dynamic: true,
        },
        schemaResolvedErrors: {
          type: 'string',
          dynamic: true,
        },
        title: {
          type: 'string',
        },
      },
    },
    'login-button': {
      selfClosing: true,
      attributes: {
        label: {
          type: 'string',
        },
        labelTranslationKey: {
          type: 'string',
          default: 'userMenu.login',
        },
        size: {
          type: 'string',
          default: 'medium',
          enum: ['small', 'medium', 'large'],
        },
        variant: {
          type: 'string',
          default: 'primary',
          enum: ['primary', 'secondary', 'outlined', 'text', 'link', 'ghost'],
        },
      },
    },
    'markdoc-example': {
      attributes: {
        codeLabel: {
          type: 'string',
        },
        renderDemo: {
          type: 'boolean',
          default: false,
        },
        resultLabel: {
          type: 'string',
        },
        withLabels: {
          type: 'boolean',
        },
      },
    },
    'numbered-item': {
      attributes: {
        icon: {
          type: 'string',
        },
        iconRawContent: {
          type: 'string',
        },
      },
    },
    'numbered-list': {
      attributes: {
        size: {
          type: 'string',
          default: 'medium',
          enum: ['small', 'medium'],
        },
        type: {
          type: 'string',
          default: 'number',
          enum: ['icon', 'number', 'dot'],
        },
      },
    },
    'openapi-code-sample': {
      selfClosing: true,
      attributes: {
        codeSamplesResolved: {
          type: 'string',
          dynamic: true,
        },
        descriptionFile: {
          type: 'string',
          required: true,
          dynamic: true,
        },
        environment: {
          type: 'string',
          dynamic: true,
        },
        environments: {
          type: 'string',
          dynamic: true,
        },
        exampleKey: {
          type: 'string',
          dynamic: true,
        },
        language: {
          type: 'string',
          dynamic: true,
        },
        mimeType: {
          type: 'string',
          dynamic: true,
        },
        operationId: {
          type: 'string',
          dynamic: true,
        },
        parameters: {
          type: 'string',
          dynamic: true,
        },
        pointer: {
          type: 'string',
          dynamic: true,
        },
        requestBody: {
          type: 'string',
          dynamic: true,
        },
      },
    },
    'openapi-example': {
      selfClosing: true,
      attributes: {
        descriptionFile: {
          type: 'string',
          required: true,
          dynamic: true,
        },
        mimeType: {
          type: 'string',
        },
        options: {
          type: 'string',
          dynamic: true,
        },
        pointer: {
          type: 'string',
          required: true,
        },
      },
    },
    'openapi-response-sample': {
      selfClosing: true,
      attributes: {
        descriptionFile: {
          type: 'string',
          required: true,
          dynamic: true,
        },
        exampleKey: {
          type: 'string',
          dynamic: true,
        },
        operationId: {
          type: 'string',
          dynamic: true,
        },
        pointer: {
          type: 'string',
          dynamic: true,
        },
        responseSamplesResolved: {
          type: 'string',
          dynamic: true,
        },
      },
    },
    partial: {
      selfClosing: true,
      attributes: {
        file: {
          type: 'string',
          dynamic: true,
        },
        variables: {
          type: 'string',
          dynamic: true,
        },
      },
    },
    'replay-openapi': {
      selfClosing: true,
      attributes: {
        descriptionFile: {
          type: 'string',
          required: true,
          dynamic: true,
        },
        environment: {
          type: 'string',
          dynamic: true,
        },
        environments: {
          type: 'string',
          dynamic: true,
        },
        exampleKey: {
          type: 'string',
          dynamic: true,
        },
        hideOtherSecuritySchemes: {
          type: 'boolean',
          dynamic: true,
        },
        mimeType: {
          type: 'string',
          dynamic: true,
        },
        operationId: {
          type: 'string',
          dynamic: true,
        },
        options: {
          type: 'string',
          dynamic: true,
        },
        parameters: {
          type: 'string',
          dynamic: true,
        },
        pointer: {
          type: 'string',
          dynamic: true,
        },
        requestBody: {
          type: 'string',
          dynamic: true,
        },
      },
    },
    slot: {
      attributes: {
        primary: {
          type: 'string',
          required: true,
        },
      },
    },
    step: {
      attributes: {
        heading: {
          type: 'string',
        },
        id: {
          type: 'string',
          required: true,
        },
        unless: {
          type: 'string',
          dynamic: true,
        },
        when: {
          type: 'string',
          dynamic: true,
        },
      },
    },
    tab: {
      attributes: {
        disable: {
          type: 'boolean',
          default: false,
        },
        icon: {
          type: 'string',
        },
        label: {
          type: 'string',
          required: true,
        },
      },
    },
    table: {},
    tabs: {
      attributes: {
        id: {
          type: 'string',
        },
        size: {
          type: 'string',
          default: 'medium',
          enum: ['small', 'medium'],
        },
      },
    },
    toggle: {
      attributes: {
        id: {
          type: 'string',
          required: true,
        },
        label: {
          type: 'string',
          required: true,
        },
        unless: {
          type: 'string',
          dynamic: true,
        },
        when: {
          type: 'string',
          dynamic: true,
        },
      },
    },
  },
};
