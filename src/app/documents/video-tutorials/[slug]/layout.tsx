import type { Metadata } from 'next'
import { getNav } from '@/lib/docs/markdown'
import DocsLayoutClient from '@/components/docs/DocsLayoutClient'

export const metadata: Metadata = {
  title: 'วิดีโอสอนการใช้งาน',
}

export default function VideoTutorialsLayout({ children }: { children: React.ReactNode }) {
  const nav = getNav('video-tutorials')
  return (
    <DocsLayoutClient
      nav={nav}
      title="วิดีโอสอนการใช้งาน"
      homeHref="/documents/video-tutorials/admin-overview"
      basePath="/documents/video-tutorials"
    >
      {children}
    </DocsLayoutClient>
  )
}
