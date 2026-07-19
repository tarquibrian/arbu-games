'use client'

import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'

// Escaneo real de cámara para producción: lee frames del <video> a un <canvas>
// oculto y corre jsQR sobre cada uno hasta decodificar un código. Sin librería de
// UI de por medio para mantener control total sobre el loop y poder cortarlo limpio.
export function QRScanner({ onScan }: { onScan: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    let rafId = 0
    let stream: MediaStream | null = null

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        if (cancelled) { s.getTracks().forEach((t) => t.stop()); return }
        stream = s
        const video = videoRef.current
        if (video) {
          video.srcObject = s
          video.play()
        }
        rafId = requestAnimationFrame(tick)
      })
      .catch((e: Error) => setError(e.message || 'No se pudo acceder a la cámara'))

    function tick() {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height)
          if (code?.data) {
            onScan(code.data)
            return
          }
        }
      }
      rafId = requestAnimationFrame(tick)
    }

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [onScan])

  return (
    <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-black aspect-square">
      <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
      <canvas ref={canvasRef} className="hidden" />
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 p-4">
          <p className="text-center text-sm text-white">{error}</p>
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-emerald-400/70" />
      )}
    </div>
  )
}
