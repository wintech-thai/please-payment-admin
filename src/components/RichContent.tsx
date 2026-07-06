'use client'

import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'

function extractPreviewText(content?: string | null): string {
  if (!content) return ''
  try {
    const doc = JSON.parse(content)
    if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) return content
    const texts: string[] = []
    const walk = (node: any) => {
      if (node.type === 'text') texts.push(node.text ?? '')
      else if (node.content) node.content.forEach(walk)
    }
    if (doc.content) doc.content.forEach(walk)
    return texts.join('').trim() || content
  } catch {
    return content
  }
}

function renderMarks(text: string, marks: any[] = []): React.ReactNode {
  let node: React.ReactNode = text
  for (const mark of marks) {
    if (mark.type === 'bold') node = <strong className="font-bold">{node}</strong>
    else if (mark.type === 'italic') node = <em className="italic">{node}</em>
    else if (mark.type === 'strike') node = <s>{node}</s>
    else if (mark.type === 'code') node = <code className="bg-black/10 rounded px-0.5 font-mono text-[11px]">{node}</code>
  }
  return node
}

function renderInline(node: any, i: number): React.ReactNode {
  if (node.type === 'text') return <React.Fragment key={i}>{renderMarks(node.text ?? '', node.marks)}</React.Fragment>
  if (node.type === 'hardBreak') return <br key={i} />
  return null
}

function renderBlock(node: any, i: number, onImageClick?: (src: string) => void): React.ReactNode {
  if (node.type === 'paragraph') {
    return <p key={i} className="mb-1 last:mb-0 empty:h-4">{node.content?.map(renderInline)}</p>
  }
  if (node.type === 'bulletList') {
    return <ul key={i} className="list-disc pl-4 mb-1 last:mb-0">{node.content?.map((li: any, j: number) => <li key={j}>{li.content?.map((b: any, k: number) => renderBlock(b, k, onImageClick))}</li>)}</ul>
  }
  if (node.type === 'orderedList') {
    return <ol key={i} className="list-decimal pl-4 mb-1 last:mb-0">{node.content?.map((li: any, j: number) => <li key={j}>{li.content?.map((b: any, k: number) => renderBlock(b, k, onImageClick))}</li>)}</ol>
  }
  if (node.type === 'codeBlock') {
    return <pre key={i} className="bg-black/10 rounded p-2 font-mono text-xs mb-1 last:mb-0 whitespace-pre-wrap">{node.content?.map((n: any) => n.text).join('')}</pre>
  }
  if (node.type === 'blockquote') {
    return <blockquote key={i} className="border-l-2 border-current/30 pl-2 mb-1 last:mb-0">{node.content?.map((b: any, j: number) => renderBlock(b, j, onImageClick))}</blockquote>
  }
  if (node.type === 'listItem') {
    return <React.Fragment key={i}>{node.content?.map((b: any, j: number) => renderBlock(b, j, onImageClick))}</React.Fragment>
  }
  if (node.type === 'image') {
    const src = node.attrs?.src
    return (
      <img
        key={i}
        src={src}
        alt={node.attrs?.alt ?? ''}
        className="max-w-full rounded-lg my-1 cursor-zoom-in"
        style={{ maxHeight: '400px', objectFit: 'contain' }}
        onClick={() => src && onImageClick?.(src)}
      />
    )
  }
  return null
}

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div className="relative" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 w-7 h-7 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <img
          src={src}
          alt=""
          className="rounded-lg object-contain"
          style={{ maxWidth: '90vw', maxHeight: '90vh' }}
        />
      </div>
    </div>
  )
}

export default function RichContent({ content }: { content?: string | null }) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  if (!content) return null

  try {
    const doc = JSON.parse(content)
    if (typeof doc !== 'object' || doc === null || Array.isArray(doc) || !doc.content) {
      return <span className="whitespace-pre-wrap break-words">{content}</span>
    }

    const replyTo = doc.replyTo as { id?: string; author?: string; content?: string } | undefined

    return (
      <>
        <div className="text-sm leading-relaxed">
          {replyTo && (
            <div className="flex gap-1.5 mb-2 rounded-lg overflow-hidden">
              <div className="w-0.5 bg-current opacity-40 rounded-full flex-shrink-0" />
              <div className="min-w-0 flex-1 opacity-70">
                <p className="text-[11px] font-semibold mb-0.5">{replyTo.author}</p>
                <p className="text-xs truncate">{extractPreviewText(replyTo.content)}</p>
              </div>
            </div>
          )}
          {doc.content.map((node: any, i: number) => renderBlock(node, i, setLightboxSrc))}
        </div>
        {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
      </>
    )
  } catch {
    return <span className="whitespace-pre-wrap break-words">{content}</span>
  }
}
