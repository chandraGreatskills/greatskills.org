import { useCallback, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { FiX, FiZoomIn, FiZoomOut } from 'react-icons/fi'

// Draws the chosen area onto a canvas at a fixed size and returns a JPEG.
// Re-encoding in the browser also drops the photo's hidden details (EXIF),
// including any GPS location the phone stored in it.
async function crop(src: string, area: Area, width: number, height: number): Promise<File> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = reject
    i.src = src
  })
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, width, height)
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not prepare the image'))), 'image/jpeg', 0.9),
  )
  return new File([blob], 'image.jpg', { type: 'image/jpeg' })
}

// Crop dialog. "photo" shows a circle guide and saves 400x400; "cover" saves
// a 1600x400 banner.
export default function ImageCropper({
  src,
  shape,
  onCancel,
  onSave,
}: {
  src: string
  shape: 'photo' | 'cover'
  onCancel: () => void
  onSave: (file: File) => Promise<void>
}) {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const photo = shape === 'photo'
  const onDone = useCallback((_: Area, px: Area) => setArea(px), [])

  const save = async () => {
    if (!area) return
    setBusy(true)
    setError('')
    try {
      await onSave(await crop(src, area, photo ? 400 : 1600, photo ? 400 : 400))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the image')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy/60 p-4" onClick={onCancel}>
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-card" onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="flex items-center justify-between border-b border-navy/5 px-5 py-3">
          <p className="font-semibold text-navy">{photo ? 'Crop your photo' : 'Crop your cover'}</p>
          <button onClick={onCancel} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full hover:bg-navy-50">
            <FiX className="h-4 w-4" />
          </button>
        </div>
        <div className={`relative bg-navy ${photo ? 'h-80' : 'h-64'}`}>
          <Cropper
            image={src}
            crop={pos}
            zoom={zoom}
            aspect={photo ? 1 : 4}
            cropShape={photo ? 'round' : 'rect'}
            showGrid={!photo}
            onCropChange={setPos}
            onZoomChange={setZoom}
            onCropComplete={onDone}
          />
        </div>
        <div className="space-y-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <FiZoomOut className="h-4 w-4 text-ink" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-green-deep"
              aria-label="Zoom"
            />
            <FiZoomIn className="h-4 w-4 text-ink" />
          </div>
          <p className="text-xs text-ink">Drag to position, slide to zoom. {photo ? 'Shown as a circle across the site.' : 'Wide banners look best.'}</p>
          {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={onCancel} className="btn-ghost">
              Cancel
            </button>
            <button onClick={save} disabled={busy || !area} className="btn-green disabled:opacity-50">
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
