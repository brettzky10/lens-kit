'use client'
import { useState } from 'react'
import { useEditor, totalDuration, timecode } from '@/lib/editor/store'

export function ExportModal({ onClose }: { onClose: () => void }) {
  const s = useEditor()
  const total = totalDuration(s.clips)
  const from = s.inPoint ?? 0, to = s.outPoint ?? total
  const [progress, setProgress] = useState<number | null>(null)
  const [url, setUrl] = useState(''), [err, setErr] = useState('')

  const run = async () => {
    setErr(''); setUrl(''); setProgress(0)
    try {
      const { exportMp4 } = await import('@/lib/editor/export') // loaded lazily: ffmpeg is browser-only
      const blob = await exportMp4({ tracks: s.tracks, clips: s.clips, assets: s.assets, from, to }, setProgress)
      setUrl(URL.createObjectURL(blob))
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)) } finally { setProgress(null) }
  }
  const busy = progress !== null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onPointerDown={() => !busy && onClose()}>
      <div onPointerDown={e => e.stopPropagation()} className="w-96 rounded-xl border border-zinc-700 bg-zinc-900 p-5 space-y-3 shadow-2xl">
        <h2 className="font-semibold">Export MP4</h2>
        <p className="text-xs text-zinc-400">Range: <span className="text-amber-300 tabular-nums">{timecode(from)}</span> – <span className="text-amber-300 tabular-nums">{timecode(to)}</span>
          {s.inPoint === null && s.outPoint === null ? ' (whole timeline — press I / O to mark a range)' : ' (marked in/out)'}</p>
        <p className="text-[11px] text-zinc-500">1280×720 · 24 fps · H.264 + AAC. Rendered in your browser, so long ranges take a while.</p>
        {busy && <div className="h-2 rounded bg-zinc-800 overflow-hidden"><div className="h-full bg-blue-500 transition-all" style={{ width: `${Math.round(progress! * 100)}%` }} /></div>}
        {err && <p className="text-xs text-red-400">{err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          {url && <a href={url} download="export.mp4" className="px-3 py-1.5 rounded bg-emerald-600 text-white text-xs">Download MP4</a>}
          <button onClick={onClose} disabled={busy} className="px-3 py-1.5 rounded bg-zinc-800 text-xs disabled:opacity-40">Close</button>
          <button onClick={run} disabled={busy || !s.clips.length} className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs disabled:opacity-40">{busy ? `Rendering ${Math.round(progress! * 100)}%` : 'Render'}</button>
        </div>
      </div>
    </div>
  )
}
