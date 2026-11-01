import { useRef, useState } from 'react'
import { FiCheck, FiUpload, FiX } from 'react-icons/fi'
import { ApiError, api } from '../lib/api'
import { COVERS } from '../lib/covers'
import ImageCropper from './ImageCropper'
import { readImage } from '../lib/images'

// Pick a gallery cover, upload your own (verified members), or go back to
// the default.
export default function CoverPicker({
  current,
  onClose,
  onChanged,
}: {
  current?: string | null
  onClose: () => void
  onChanged: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [src, setSrc] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setError('')
    try {
      await fn()
      onChanged()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not change the cover')
      setBusy(false)
    }
  }

  if (src) {
    return (
      <ImageCropper
        src={src}
        shape="cover"
        onCancel={() => setSrc(null)}
        onSave={async (file) => {
          try {
            await api.upload('/profiles/me/cover', file)
          } catch (err) {
            setSrc(null)
            setError(err instanceof ApiError ? err.message : 'Upload failed')
            return
          }
          onChanged()
          onClose()
        }}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy/50 p-4" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-card" onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="flex items-center justify-between border-b border-navy/5 px-5 py-3">
          <p className="font-semibold text-navy">Choose a cover</p>
          <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full hover:bg-navy-50">
            <FiX className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {COVERS.map((c) => {
              const on = current === `g:${c.key}`
              return (
                <button
                  key={c.key}
                  disabled={busy}
                  onClick={() => run(() => api.patch('/profiles/me', { cover: `g:${c.key}` }))}
                  className={`group relative overflow-hidden rounded-lg text-left ring-2 ${on ? 'ring-green-deep' : 'ring-transparent hover:ring-navy/30'}`}
                >
                  <div className="h-14" style={{ background: c.css, backgroundSize: 'cover' }} />
                  <span className="block bg-white px-2 py-1 text-xs font-medium text-navy">{c.label}</span>
                  {on && (
                    <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-green-deep text-white">
                      <FiCheck className="h-3 w-3" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          {error && <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</p>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-navy/5 px-5 py-3">
          <button onClick={() => run(() => api.del('/profiles/me/cover'))} disabled={busy} className="text-sm font-medium text-ink hover:text-navy">
            Use the default
          </button>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-ink sm:inline">Uploads are for verified members</span>
            <button onClick={() => input.current?.click()} disabled={busy} className="btn-ghost inline-flex items-center gap-2">
              <FiUpload className="h-4 w-4" /> Upload your own
            </button>
          </div>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) setSrc(await readImage(f))
            }}
          />
        </div>
      </div>
    </div>
  )
}
