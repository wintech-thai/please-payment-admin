'use client'

import { useRef, useState } from 'react'
import { Image as ImageIcon, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { bankAccountApi } from '@/lib/api/bank-account.api'

// x090 4.c.iii : resize before upload, same quality/size tradeoff as the service-request book-bank uploader
async function compressImageToBase64(file: File, maxWidth = 1800, quality = 0.9): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width, h = img.height
        if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth }
        canvas.width = w; canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1])
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function ImagePreviewModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
        <X className="w-5 h-5" />
      </button>
      <img src={src} alt="book bank" className="max-w-full max-h-full object-contain rounded-lg" onClick={e => e.stopPropagation()} />
    </div>
  )
}

// Icon button for list pages — lazily fetches the image (via GetBankAccountById) only when clicked, to keep list payloads light
export function BookBankPreviewIcon({ bankAccountId, title }: { bankAccountId: string; title?: string }) {
  const [loading, setLoading] = useState(false)
  const [src, setSrc] = useState<string | null>(null)

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (loading) return
    setLoading(true)
    try {
      const res = await bankAccountApi.getBankAccountById(bankAccountId)
      const data = res.data as any
      const base64 = data?.bookBankImageBase64 ?? data?.BookBankImageBase64
      const mime = data?.bookBankMimeType ?? data?.BookBankMimeType ?? 'image/jpeg'
      if (base64) setSrc(`data:${mime};base64,${base64}`)
      else toast.error('ไม่พบรูปภาพ')
    } catch {
      toast.error('โหลดรูปภาพไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title={title ?? 'Book Bank'}
        className="inline-flex items-center justify-center w-6 h-6 rounded-md text-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-40"
        disabled={loading}
      >
        <ImageIcon className="w-4 h-4" />
      </button>
      {src && <ImagePreviewModal src={src} onClose={() => setSrc(null)} />}
    </>
  )
}

// Preview (if present) + upload/replace control for the bank-account detail page
export function BookBankUploadControl({ bankAccountId, imageBase64, mimeType, onUploaded, labels }: {
  bankAccountId: string
  imageBase64?: string | null
  mimeType?: string | null
  onUploaded: () => void
  labels: { title: string; upload: string; replace: string; uploading: string; success: string; failed: string }
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const src = imageBase64 ? `data:${mimeType ?? 'image/jpeg'};base64,${imageBase64}` : null

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const base64 = await compressImageToBase64(file)
      await bankAccountApi.uploadBookBank(bankAccountId, base64, 'image/jpeg')
      toast.success(labels.success)
      onUploaded()
    } catch {
      toast.error(labels.failed)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div>
      <span className="text-sm text-gray-400">{labels.title}</span>
      <div className="mt-2 flex items-center gap-3">
        {src && (
          <button type="button" onClick={() => setShowPreview(true)} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0 hover:opacity-90 transition-opacity">
            <img src={src} alt="book bank" className="w-full h-full object-cover" />
          </button>
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors disabled:opacity-60"
        >
          <Upload className="w-3.5 h-3.5" />
          {uploading ? labels.uploading : (src ? labels.replace : labels.upload)}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>
      {showPreview && src && <ImagePreviewModal src={src} onClose={() => setShowPreview(false)} />}
    </div>
  )
}
