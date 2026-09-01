import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { marked } from 'marked'
import { DEFAULT_LOCALE, type DocLocale } from './locale'

export { DOC_LOCALES, DEFAULT_LOCALE, isDocLocale } from './locale'
export type { DocLocale } from './locale'

const DOCS_DIR = path.join(process.cwd(), 'src/content/documents')

export interface DocMeta {
  title: string
  version?: string
  updatedAt?: string
}

export interface DocContent {
  meta: DocMeta
  html: string
  headings: { id: string; text: string; level: number }[]
}

export interface NavItem {
  slug: string
  titles: Record<DocLocale, string>
}

export interface NavSection {
  section: Record<DocLocale, string>
  items: NavItem[]
}

export function getNav(): NavSection[] {
  const navPath = path.join(DOCS_DIR, '_nav.json')
  return JSON.parse(fs.readFileSync(navPath, 'utf-8'))
}

export function getDoc(slug: string, locale: DocLocale = DEFAULT_LOCALE, apiUrl?: string, merchantUrl?: string): DocContent | null {
  const localizedPath = path.join(DOCS_DIR, locale, `${slug}.md`)
  const fallbackPath = path.join(DOCS_DIR, DEFAULT_LOCALE, `${slug}.md`)
  const filePath = fs.existsSync(localizedPath) ? localizedPath : fallbackPath
  if (!fs.existsSync(filePath)) return null

  let raw = fs.readFileSync(filePath, 'utf-8')

  const resolvedApiUrl = apiUrl || process.env.NEXT_PUBLIC_DOCS_API_URL || 'https://api.please-payment.com'
  const resolvedMerchantUrl = merchantUrl || process.env.NEXT_PUBLIC_MERCHANT_URL || 'https://merchant.please-payment.com'
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'
  const buildDate = process.env.NEXT_PUBLIC_BUILD_DATE || new Date().toISOString().slice(0, 10)
  raw = raw
    .replaceAll('{{API_URL}}', resolvedApiUrl)
    .replaceAll('{{MERCHANT_URL}}', resolvedMerchantUrl)
    .replaceAll('{{APP_VERSION}}', appVersion)
    .replaceAll('{{BUILD_DATE}}', buildDate)

  const { data, content } = matter(raw)

  const headings: { id: string; text: string; level: number }[] = []

  const renderer = new marked.Renderer()
  renderer.heading = ({ text, depth }) => {
    const id = text
      .toLowerCase()
      .replace(/[^฀-๿一-鿿a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '-')
    headings.push({ id, text, level: depth })
    return `<h${depth} id="${id}">${text}</h${depth}>`
  }

  marked.use({ renderer })
  const html = marked(content) as string

  return {
    meta: {
      title: data.title ?? slug,
      version: data.version,
      updatedAt: data.updatedAt,
    },
    html,
    headings,
  }
}

export function getAllSlugs(): string[] {
  return fs
    .readdirSync(path.join(DOCS_DIR, DEFAULT_LOCALE))
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace('.md', ''))
}
