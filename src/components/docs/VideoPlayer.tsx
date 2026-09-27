'use client'

import { useEffect, useRef, useState } from 'react'
import { Play } from 'lucide-react'

export default function VideoPlayer({ src, startLabel = 'Start Video' }: { src: string; startLabel?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    if (!started) return
    const video = videoRef.current
    if (!video) return

    // Safari supports HLS natively; everyone else needs hls.js — loaded lazily
    // so it never ships on the page until the viewer actually presses play.
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src
      video.play().catch(() => {})
      return
    }

    let hls: import('hls.js').default | undefined
    let cancelled = false

    import('hls.js').then(({ default: Hls }) => {
      if (cancelled) return
      if (Hls.isSupported()) {
        hls = new Hls()
        hls.loadSource(src)
        hls.attachMedia(video)
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {})
        })
      }
    })

    return () => {
      cancelled = true
      hls?.destroy()
    }
  }, [started, src])

  return (
    <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-black aspect-video">
      {!started ? (
        <button
          type="button"
          onClick={() => setStarted(true)}
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900 hover:bg-zinc-800 transition-colors group"
        >
          <span className="w-16 h-16 rounded-full bg-primary-600 group-hover:bg-primary-500 flex items-center justify-center transition-colors">
            <Play className="w-7 h-7 text-white ml-1" fill="currentColor" />
          </span>
          <span className="text-sm font-semibold text-white">{startLabel}</span>
        </button>
      ) : (
        <video ref={videoRef} controls autoPlay className="w-full h-full" />
      )}
    </div>
  )
}
