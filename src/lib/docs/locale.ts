// Locale constants shared by both server code (markdown.ts) and client
// components (DocsLayoutClient.tsx). Kept separate from markdown.ts because
// that file imports Node-only modules (fs/path) which cannot be bundled
// into a client component.

export const DOC_LOCALES = ['th', 'en', 'zh'] as const
export type DocLocale = (typeof DOC_LOCALES)[number]
export const DEFAULT_LOCALE: DocLocale = 'th'

export function isDocLocale(value: string | undefined | null): value is DocLocale {
  return !!value && (DOC_LOCALES as readonly string[]).includes(value)
}
