'use client'
import { useRef, useCallback } from 'react'
import { Lock, Unlock, Volume2, VolumeX, Eye, EyeOff, Music, Layers } from 'lucide-react'
import { TipButton } from './TipButton'
import { useEditor, totalDuration, type Clip } from '@/lib/editor/store'

const BASE_PPS = 12 // pixels per second at zoom 1
const HEADER_W = 128
const ROW_H = 56

export function Timeline() {
  const s = useEditor()
  const pps = BASE_PPS * s.zoom
  const thumbOf = (c: Clip) => s.assets.find(a => a.id === c.assetId)?.thumb
  const width = Math.max(1200, (totalDuration(s.clips) + 30) * pps)
  const scrollRef = useRef<HTMLDivElement>(null)

  const timeFromEvent = (clientX: number) => {
    const el = scrollRef.current!
    return (clientX - el.getBoundingClientRect().left + el.scrollLeft - HEADER_W) / pps
  }

  const snapTime = useCallback((t: number, ignoreId: string, dur = 0) => {
    if (!s.snap) return t
    const pts = [0, s.playhead, ...s.clips.filter(c => c.id !== ignoreId).flatMap(c => [c.start, c.start + c.duration])]
    const thresh = 8 / pps
    for (const p of pts) {
      if (Math.abs(t - p) < thresh) return p
      if (Math.abs(t + dur - p) < thresh) return p - dur
    }
    return t
  }, [s.snap, s.playhead, s.clips, pps])

  const startDrag = (e: React.PointerEvent, clip: Clip, mode: 'move' | 'l' | 'r') => {
    e.stopPropagation()
    const st = useEditor.getState()
    if (st.tracks.find(t => t.id === clip.trackId)?.locked) return
    if (st.tool === 'razor') { st.splitAt(clip.id, timeFromEvent(e.clientX)); return }
    st.select(clip.id, e.shiftKey)
    st.checkpoint()
    const tool = st.tool, x0 = e.clientX, orig = { ...clip }
    const sp = orig.speed ?? 1, tr0 = orig.trimStart ?? 0, origEnd = orig.start + orig.duration
    const srcLen = (c: Clip) => st.assets.find(a => a.id === c.assetId)?.duration ?? Infinity
    const others = st.clips.filter(c => c.trackId === clip.trackId && c.id !== clip.id).map(c => ({ ...c }))
    const after = others.filter(c => c.start >= origEnd - 0.01)
    const nb = others.find(c => Math.abs(c.start - origEnd) < 0.05) // neighbour on the right
    const pb = others.find(c => Math.abs(c.start + c.duration - orig.start) < 0.05) // neighbour on the left
    const patch = (id: string, p: Partial<Clip>) => useEditor.getState().patchClip(id, p)
    const move = (ev: PointerEvent) => {
      const dt = (ev.clientX - x0) / pps
      if (mode === 'move') {
        if (tool === 'slip') { patch(clip.id, { trimStart: Math.min(srcLen(orig) - orig.duration * sp, Math.max(0, tr0 - dt * sp)) }); return }
        const start = Math.max(0, snapTime(orig.start + dt, clip.id, orig.duration))
        const row = document.elementsFromPoint(ev.clientX, ev.clientY).find(n => (n as HTMLElement).dataset?.track) as HTMLElement | undefined
        const target = row && st.tracks.find(t => t.id === row.dataset.track && t.kind === (orig.type === 'audio' ? 'audio' : 'video') && !t.locked)
        patch(clip.id, { start, ...(target ? { trackId: target.id } : {}) })
      } else if (mode === 'r') {
        let d = snapTime(origEnd + dt, clip.id) - origEnd
        d = Math.max(0.25 - orig.duration, Math.min((srcLen(orig) - tr0) / sp - orig.duration, d))
        if (tool === 'roll') {
          if (!nb) return
          const ns = nb.speed ?? 1
          d = Math.min(nb.duration - 0.25, Math.max(-(nb.trimStart ?? 0) / ns, d))
          patch(nb.id, { start: nb.start + d, duration: nb.duration - d, trimStart: (nb.trimStart ?? 0) + d * ns })
        }
        patch(clip.id, { duration: orig.duration + d })
        if (tool === 'ripple') after.forEach(c => patch(c.id, { start: c.start + d }))
      } else {
        let d = snapTime(orig.start + dt, clip.id) - orig.start
        d = Math.min(orig.duration - 0.25, Math.max(-tr0 / sp, d))
        if (tool !== 'ripple') d = Math.max(-orig.start, d)
        if (tool === 'roll') {
          if (!pb) return
          d = Math.max(0.25 - pb.duration, Math.min((srcLen(pb) - (pb.trimStart ?? 0)) / (pb.speed ?? 1) - pb.duration, d))
          patch(pb.id, { duration: pb.duration + d })
        }
        patch(clip.id, { duration: orig.duration - d, trimStart: tr0 + d * sp, ...(tool === 'ripple' ? {} : { start: orig.start + d }) })
        if (tool === 'ripple') after.forEach(c => patch(c.id, { start: c.start - d }))
      }
    }
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }

  const scrub = (e: React.PointerEvent) => {
    const go = (ev: { clientX: number }) => s.setPlayhead(timeFromEvent(ev.clientX))
    go(e)
    const move = (ev: PointerEvent) => go(ev)
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }

  const tickStep = pps > 40 ? 1 : pps > 16 ? 5 : 10
  const ticks = Array.from({ length: Math.ceil(width / pps / tickStep) }, (_, i) => i * tickStep)
  const fmt = (t: number) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`

  return (
    <div ref={scrollRef} className="relative flex-1 overflow-auto bg-zinc-950 select-none" onPointerDown={() => s.select(null)}>
      <div style={{ width: width + HEADER_W }} className="relative">
        {/* Ruler */}
        <div className="sticky top-0 z-20 flex h-7 bg-zinc-900 border-b border-zinc-800">
          <div style={{ width: HEADER_W }} className="sticky left-0 z-30 bg-zinc-900 border-r border-zinc-800 flex items-center justify-center text-[11px] text-amber-300 tabular-nums" />
          <div className="relative flex-1 cursor-col-resize" onPointerDown={e => { e.stopPropagation(); scrub(e) }}>
            {ticks.map(t => (
              <div key={t} style={{ left: t * pps }} className="absolute top-0 h-full border-l border-zinc-700 pl-1 text-[10px] text-zinc-500 leading-7">{fmt(t)}</div>
            ))}
          </div>
        </div>

        {/* Tracks */}
        {s.tracks.map(track => (
          <div key={track.id} className="flex border-b border-zinc-800/80" style={{ height: ROW_H }}>
            <div style={{ width: HEADER_W }} className="sticky left-0 z-10 bg-zinc-900 border-r border-zinc-800 flex items-center gap-2 px-2 text-[11px] text-zinc-400">
              <span className={`font-semibold w-6 ${track.kind === 'video' ? 'text-blue-400' : 'text-emerald-400'}`}>{track.name}</span>
              <TipButton onClick={() => s.toggleTrack(track.id, 'locked')} tip={track.locked ? 'Unlock track' : 'Lock track'} className="hover:text-white">{track.locked ? <Lock size={13} className="text-amber-400" /> : <Unlock size={13} />}</TipButton>
              <TipButton onClick={() => s.toggleTrack(track.id, 'muted')} tip={track.kind === 'video' ? (track.muted ? 'Show track' : 'Hide track') : (track.muted ? 'Unmute track' : 'Mute track')} className="hover:text-white">
                {track.kind === 'video' ? (track.muted ? <EyeOff size={13} className="text-amber-400" /> : <Eye size={13} />) : track.muted ? <VolumeX size={13} className="text-amber-400" /> : <Volume2 size={13} />}
              </TipButton>
            </div>
            <div data-track={track.id} onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }} onDrop={e => { e.preventDefault(); e.stopPropagation(); const id = e.dataTransfer.getData('asset'); if (id) s.addAssetClip(id, track.id, Math.max(0, timeFromEvent(e.clientX))) }} className={`relative flex-1 ${track.kind === 'audio' ? 'bg-emerald-950/20' : ''}`} onPointerDown={e => { e.stopPropagation(); s.select(null); scrub(e) }}>
              {s.clips.filter(c => c.trackId === track.id).map(c => {
                const sel = s.selected.includes(c.id)
                const bg = c.type === 'adjustment' ? 'hsl(235 45% 18%)' : c.type === 'audio' ? 'hsl(150 40% 20%)' : `hsl(${c.hue} 35% 22%)`
                return (
                  <div key={c.id}
                    onPointerDown={e => startDrag(e, c, 'move')}
                    onContextMenu={e => { e.preventDefault(); e.stopPropagation(); s.select(c.id); s.openMenu({ x: e.clientX, y: e.clientY, clipId: c.id }) }}
                    style={{ left: c.start * pps, width: c.duration * pps, background: bg, ...(thumbOf(c) ? { backgroundImage: `url(${thumbOf(c)})`, backgroundSize: 'auto 100%', backgroundRepeat: 'repeat-x' } : {}), opacity: track.muted ? 0.4 : 1 }}
                    className={`absolute top-1 bottom-1 rounded-md overflow-hidden border ${sel ? 'border-blue-400 ring-1 ring-blue-400' : 'border-white/10'} ${s.tool === 'razor' ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'} ${c.type === 'adjustment' ? 'border-dashed' : ''}`}>
                    <div onPointerDown={e => startDrag(e, c, 'l')} className="absolute left-0 inset-y-0 w-1.5 cursor-ew-resize hover:bg-blue-400/70 z-10" />
                    <div onPointerDown={e => startDrag(e, c, 'r')} className="absolute right-0 inset-y-0 w-1.5 cursor-ew-resize hover:bg-blue-400/70 z-10" />
                    <div className="flex items-center gap-1.5 px-2 h-full text-[11px] text-zinc-200 pointer-events-none">
                      {c.type === 'audio' ? <Music size={12} className="text-emerald-300 shrink-0" /> : c.type === 'adjustment' ? <Layers size={12} className="shrink-0" /> : null}
                      <span className="truncate">{c.name}</span>
                      <span className="text-zinc-500 ml-auto shrink-0">{c.duration.toFixed(1)}s</span>
                    </div>
                    {c.type === 'audio' && <div className="absolute inset-x-0 bottom-0 h-3 opacity-40" style={{ background: 'repeating-linear-gradient(90deg,#34d399 0 1px,transparent 1px 4px)' }} />}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {(s.inPoint !== null || s.outPoint !== null) && (() => {
          const a = s.inPoint ?? 0, b = s.outPoint ?? width / pps
          return <div className="absolute top-0 bottom-0 z-10 pointer-events-none bg-blue-500/10 border-x border-blue-400/60" style={{ left: HEADER_W + a * pps, width: Math.max(0, (b - a) * pps) }} />
        })()}
        {/* Playhead */}
        <div className="absolute top-0 bottom-0 z-20 w-px bg-red-500 pointer-events-none" style={{ left: HEADER_W + s.playhead * pps }}>
          <div className="absolute -top-0 -left-[5px] w-[11px] h-3 bg-red-500 [clip-path:polygon(0_0,100%_0,50%_100%)]" />
        </div>
      </div>
    </div>
  )
}
