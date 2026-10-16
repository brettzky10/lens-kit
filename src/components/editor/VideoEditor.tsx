'use client'
import { useEffect, useRef, useState } from 'react'
import { MousePointer2, Scissors, Magnet, Play, Pause, SkipBack, SkipForward, Undo2, Redo2, Trash2, ZoomIn, ZoomOut, Download, Plus, Film, Upload, X, Music, ArrowLeftRight, ChevronsRight, Move } from 'lucide-react'
import { useEditor, timecode, totalDuration, type Asset, type Clip } from '@/lib/editor/store'
import { Timeline } from './Timeline'
import { ContextMenu, type MenuItem } from './ContextMenu'
import { PropertiesPanel } from './PropertiesPanel'
import { probe } from '@/lib/editor/media'
import { ExportModal } from './ExportModal'
import { TipButton } from './TipButton'

/** Keeps a <video>/<audio> element in sync with the timeline playhead. */
function Media({ clip, asset, muted }: { clip: Clip; asset: Asset; muted: boolean }) {
  const ref = useRef<HTMLMediaElement>(null)
  const playing = useEditor(s => s.playing)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const t = useEditor.getState().playhead
    const target = (clip.trimStart ?? 0) + (t - clip.start) * (clip.speed ?? 1)
    if (Math.abs(el.currentTime - target) > (playing ? 0.3 : 0.05)) el.currentTime = target
    el.playbackRate = clip.speed ?? 1; el.volume = clip.volume ?? 1; el.muted = muted
    if (playing && el.paused) el.play().catch(() => {}); else if (!playing && !el.paused) el.pause()
  })
  return asset.kind === 'audio'
    ? <audio ref={ref as React.RefObject<HTMLAudioElement>} src={asset.url} />
    : <video ref={ref as React.RefObject<HTMLVideoElement>} src={asset.url} playsInline className="absolute inset-0 w-full h-full object-contain" />
}

export function VideoEditor() {
  const s = useEditor()
  const total = totalDuration(s.clips)
  const fileRef = useRef<HTMLInputElement>(null)
  const [showExport, setShowExport] = useState(false)
  const [assetMenu, setAssetMenu] = useState<{ x: number; y: number; a: Asset } | null>(null)

  useEffect(() => {
    if (!s.playing) return
    let last = performance.now(), raf = 0
    const tick = (now: number) => {
      const st = useEditor.getState(), t = st.playhead + (now - last) / 1000
      last = now
      if (t >= total) { st.setPlayhead(total); st.setPlaying(false); return }
      st.setPlayhead(t); raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [s.playing, total])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches('input,textarea,select')) return
      const st = useEditor.getState(), mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase()
      if (e.code === 'Space') { e.preventDefault(); st.setPlaying(!st.playing) }
      else if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? st.redo() : st.undo() }
      else if (mod && k === 'y') { e.preventDefault(); st.redo() }
      else if (e.key === 'Delete' || e.key === 'Backspace') st.deleteSelected()
      else if (k === 'v') st.setTool('select')
      else if (e.altKey && k === 'x') st.clearMarks()
      else if (!mod && k === 'r') st.setTool('ripple')
      else if (!mod && k === 'n') st.setTool('roll')
      else if (!mod && k === 'y') st.setTool('slip')
      else if (!mod && k === 'i') st.setIn()
      else if (!mod && k === 'o') st.setOut()
      else if (k === 'c' && !mod) st.setTool('razor')
      else if (k === 's' && !mod) st.toggleSnap()
      else if (e.key === '=' || e.key === '+') st.setZoom(st.zoom + 0.25)
      else if (e.key === '-') st.setZoom(st.zoom - 0.25)
      else if (e.key === 'ArrowLeft') st.setPlayhead(st.playhead - 1 / 24)
      else if (e.key === 'ArrowRight') st.setPlayhead(st.playhead + 1 / 24)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onImport = async (files: FileList | null) => {
    if (!files) return
    const out: Asset[] = []
    for (const f of Array.from(files)) if (/^(video|audio|image)\//.test(f.type)) out.push({ id: crypto.randomUUID(), ...(await probe(f)) })
    s.addAssets(out)
    if (fileRef.current) fileRef.current.value = ''
  }

  // Timeline viewer: topmost visible video clip + all active audio clips
  const assetOf = (c: Clip) => s.assets.find(a => a.id === c.assetId)
  const row = (c: Clip) => s.tracks.findIndex(t => t.id === c.trackId)
  const at = s.clips.filter(c => c.assetId && assetOf(c) && s.playhead >= c.start && s.playhead < c.start + c.duration)
  const top = at.filter(c => c.type === 'video' && !s.tracks[row(c)]?.muted).sort((a, b) => row(a) - row(b))[0]
  const auds = at.filter(c => c.type === 'audio')
  const adj = s.clips.some(c => c.type === 'adjustment' && s.playhead >= c.start && s.playhead < c.start + c.duration)
  const src = s.assets.find(a => a.id === s.sourceId)
  const menuClip = s.menu && s.clips.find(c => c.id === s.menu!.clipId)

  const clipMenu = (c: Clip): MenuItem[] => [
    { label: 'Split at playhead', onClick: () => s.splitAt(c.id, s.playhead) },
    { label: 'Duplicate', onClick: () => { const { id, ...rest } = c; s.addClip({ ...rest, start: c.start + c.duration }) } },
    ...(c.assetId ? [{ label: 'Open in Clip Viewer', onClick: () => s.setSource(c.assetId!) }] : []),
    { label: '', sep: true, onClick: () => {} },
    { label: 'Delete', danger: true, onClick: () => { s.select(c.id); s.deleteSelected() } },
  ]
  const toolBtn = (on: boolean) => `p-1.5 rounded-lg transition-colors ${on ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`
  const tc = 'flex items-center gap-2 px-3 py-1 text-xs rounded-t-md cursor-pointer border border-b-0'

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-200 text-sm">
      <header className="h-11 flex items-center gap-4 px-4 border-b border-zinc-800 bg-zinc-900">
        <span className="font-black tracking-tight text-lg">Koan</span>
        <TipButton tip="Export MP4" onClick={() => setShowExport(true)} className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800"><Download size={13} />Export</TipButton>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Assets + timelines */}
        <aside className="w-72 border-r border-zinc-800 flex flex-col">
          <div className="p-3 flex items-center justify-between font-semibold">Assets
            <TipButton  onClick={() => fileRef.current?.click()} title="Import media" className="text-zinc-400 hover:text-white"><Upload size={16} /></TipButton>
            <input ref={fileRef} type="file" multiple accept="video/*,audio/*,image/*" className="hidden" onChange={e => onImport(e.target.files)} />
          </div>
          <div className="grid grid-cols-2 gap-2 px-3 overflow-auto flex-1 content-start"
            onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); onImport(e.dataTransfer.files) }}>
            {s.assets.length === 0 && <p className="col-span-2 text-xs text-zinc-500 py-6 text-center">Drop video, audio or images here, or use the upload button.</p>}
            {s.assets.map(a => (
              <div key={a.id} draggable onDragStart={e => e.dataTransfer.setData('asset', a.id)}
                onClick={() => s.setSource(a.id)} onDoubleClick={() => s.addAssetClip(a.id)}
                onContextMenu={e => { e.preventDefault(); setAssetMenu({ x: e.clientX, y: e.clientY, a }) }}
                title="Click to preview · double-click or drag to add"
                className={`aspect-video rounded-lg relative overflow-hidden border cursor-grab bg-zinc-900 ${s.sourceId === a.id ? 'border-blue-500' : 'border-zinc-800 hover:border-zinc-600'}`}>
                {a.thumb ? <img src={a.thumb} alt="" className="w-full h-full object-cover" draggable={false} /> : <Music className="m-auto mt-6 text-emerald-400" />}
                <span className="absolute bottom-1 left-1.5 right-1.5 truncate text-[10px] bg-black/60 rounded px-1">{a.name} · {a.duration.toFixed(1)}s</span>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-zinc-800 flex items-center justify-between font-semibold">Timelines
            <TipButton tip="New timeline" onClick={s.newTimeline} className="text-zinc-400 hover:text-white"><Plus size={15} /></TipButton></div>
          <div className="px-3 pb-3 space-y-1 max-h-32 overflow-auto">
            {s.timelines.map(t => (
              <TipButton key={t.id} onClick={() => s.switchTimeline(t.id)}
                className={`w-full flex items-center gap-2 p-2 rounded-lg text-xs border ${t.id === s.activeId ? 'bg-blue-600/20 border-blue-500/40' : 'border-transparent hover:bg-zinc-800'}`}>
                <Film size={14} className={t.id === s.activeId ? 'text-blue-400' : 'text-zinc-500'} />{t.name}
                {t.id === s.activeId && <span className="ml-auto text-[9px] text-blue-400">ACTIVE</span>}
              </TipButton>
            ))}
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0">
          {/* Two viewers */}
          <div className="flex-1 min-h-0 flex bg-black gap-px">
            <section className="flex-1 flex flex-col min-w-0 bg-zinc-950">
              <div className="h-7 px-3 flex items-center text-xs text-zinc-400 bg-zinc-900">Clip Viewer
                {src && <button onClick={() => s.addAssetClip(src.id, undefined, s.playhead)} className="ml-auto px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200">Add to timeline</button>}</div>
              <div className="flex-1 min-h-0 flex items-center justify-center bg-black">
                {!src ? <span className="text-xs text-zinc-600">Select an asset to preview</span>
                  : src.kind === 'image' ? <img src={src.url} alt="" className="max-h-full max-w-full" />
                  : src.kind === 'video' ? <video key={src.id} src={src.url} controls className="max-h-full max-w-full" />
                  : <audio key={src.id} src={src.url} controls />}
              </div>
            </section>

            <section className="flex-1 flex flex-col min-w-0 bg-zinc-950">
              <div className="h-7 px-3 flex items-center text-xs text-zinc-400 bg-zinc-900">Timeline Viewer</div>
              <div className="flex-1 min-h-0 relative bg-black">
                {top && (assetOf(top)!.kind === 'image'
                  ? <img key={top.id} src={assetOf(top)!.url} alt="" className="absolute inset-0 w-full h-full object-contain" />
                  : <Media key={top.id} clip={top} asset={assetOf(top)!} muted={false} />)}
                {auds.map(c => <Media key={c.id} clip={c} asset={assetOf(c)!} muted={!!s.tracks[row(c)]?.muted} />)}
                {adj && <div className="absolute inset-0 bg-indigo-500/10 pointer-events-none" />}
                {!top && <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-600">{s.clips.length ? 'No video at playhead' : 'Drag media onto a track to start'}</div>}
              </div>
              <div className="h-9 flex items-center gap-3 px-3 text-xs bg-zinc-900">
                <span className="text-amber-300 tabular-nums">{timecode(s.playhead)}</span>
                <div className="mx-auto flex items-center gap-2">
                  <TipButton tip="Go to start" onClick={() => s.setPlayhead(0)}><SkipBack size={14} /></TipButton>
                  <TipButton tip="Play / Pause (Space)" onClick={() => s.setPlaying(!s.playing)} className="p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700">{s.playing ? <Pause size={14} /> : <Play size={14} />}</TipButton>
                  <TipButton tip="Go to end" onClick={() => s.setPlayhead(total)}><SkipForward size={14} /></TipButton>
                </div>
                <span className="text-zinc-500 tabular-nums">{timecode(total)}</span>
              </div>
            </section>
          </div>

          {/* Timeline */}
          <div className="h-[44%] min-h-[240px] flex flex-col border-t border-zinc-800">
            <div className="flex items-end gap-1 px-2 pt-1 bg-zinc-900">
              {s.timelines.filter(t => s.openIds.includes(t.id)).map(t => (
                <div key={t.id} onClick={() => s.switchTimeline(t.id)}
                  onDoubleClick={() => { const n = prompt('Rename timeline', t.name); if (n?.trim()) s.renameTimeline(t.id, n.trim()) }}
                  className={`${tc} ${t.id === s.activeId ? 'bg-zinc-950 border-zinc-700 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
                  {t.name}
                  {s.openIds.length > 1 && <TipButton tip="Close tab" onClick={e => { e.stopPropagation(); s.closeTab(t.id) }} className="hover:text-red-400"><X size={11} /></TipButton>}
                </div>
              ))}
              <TipButton tip="New timeline" onClick={s.newTimeline} className="px-2 py-1 text-zinc-500 hover:text-white"><Plus size={14} /></TipButton>
            </div>
            <div className="flex flex-1 min-h-0">
              <div className="w-10 flex flex-col items-center py-1 gap-1 bg-zinc-900 border-r border-zinc-800">
                <TipButton title="Select (V)" onClick={() => s.setTool('select')} className={toolBtn(s.tool === 'select')}><MousePointer2 size={16} /></TipButton>
                <TipButton title="Razor (C)" onClick={() => s.setTool('razor')} className={toolBtn(s.tool === 'razor')}><Scissors size={16} /></TipButton>
                <TipButton title="Ripple trim (R)" onClick={() => s.setTool('ripple')} className={toolBtn(s.tool === 'ripple')}><ChevronsRight size={16} /></TipButton>
                <TipButton title="Roll trim (N)" onClick={() => s.setTool('roll')} className={toolBtn(s.tool === 'roll')}><ArrowLeftRight size={16} /></TipButton>
                <TipButton title="Slip (Y)" onClick={() => s.setTool('slip')} className={toolBtn(s.tool === 'slip')}><Move size={16} /></TipButton>
                <TipButton title="Snapping (S)" onClick={s.toggleSnap} className={toolBtn(s.snap)}><Magnet size={16} /></TipButton>
              </div>
              <div className="flex-1 flex flex-col min-w-0">
                <Timeline />
                <div className="h-9 bg-zinc-900 border-t border-zinc-800 flex items-center gap-2 px-3 text-[11px]">
                  <TipButton tip="Undo (Ctrl+Z)" onClick={s.undo} disabled={!s.past.length} className="disabled:opacity-30 hover:text-white"><Undo2 size={14} /></TipButton>
                  <TipButton tip="Redo (Ctrl+Y)" onClick={s.redo} disabled={!s.future.length} className="disabled:opacity-30 hover:text-white"><Redo2 size={14} /></TipButton>
                  <TipButton tip="Delete selected (Del)" onClick={s.deleteSelected} disabled={!s.selected.length} className="disabled:opacity-30 hover:text-red-400"><Trash2 size={14} /></TipButton>
                  <TipButton tip="Add video track" onClick={() => s.addTrack('video')} className="px-2 py-0.5 rounded border border-zinc-700 hover:bg-zinc-800">+ V</TipButton>
                  <TipButton tip="Add audio track" onClick={() => s.addTrack('audio')} className="px-2 py-0.5 rounded border border-zinc-700 hover:bg-zinc-800">+ A</TipButton>
                  <TipButton onClick={s.setIn} title="Mark in (I)" className="px-2 py-0.5 rounded border border-zinc-700 hover:bg-zinc-800">In</TipButton>
                  <TipButton onClick={s.setOut} title="Mark out (O)" className="px-2 py-0.5 rounded border border-zinc-700 hover:bg-zinc-800">Out</TipButton>
                  {(s.inPoint !== null || s.outPoint !== null) && <TipButton onClick={s.clearMarks} title="Clear marks (Alt+X)" className="px-2 py-0.5 rounded border border-zinc-700 hover:bg-zinc-800 text-blue-400">{timecode(s.inPoint ?? 0)} – {s.outPoint !== null ? timecode(s.outPoint) : 'end'} ✕</TipButton>}
                  <div className="ml-auto flex items-center gap-2">
                    <TipButton tip="Zoom out (-)" onClick={() => s.setZoom(s.zoom - 0.25)}><ZoomOut size={14} /></TipButton>
                    <input type="range" min={25} max={400} step={5} value={s.zoom * 100} onChange={e => s.setZoom(+e.target.value / 100)} className="w-28 accent-blue-500" />
                    <TipButton tip="Zoom in (+)" onClick={() => s.setZoom(s.zoom + 0.25)}><ZoomIn size={14} /></TipButton>
                    <span className="w-9 text-right text-zinc-500 tabular-nums">{Math.round(s.zoom * 100)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        <PropertiesPanel />
      </div>

      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
      {s.menu && menuClip && <ContextMenu x={s.menu.x} y={s.menu.y} items={clipMenu(menuClip)} onClose={s.closeMenu} />}
      {assetMenu && <ContextMenu x={assetMenu.x} y={assetMenu.y} onClose={() => setAssetMenu(null)} items={[
        { label: 'Open in Clip Viewer', onClick: () => s.setSource(assetMenu.a.id) },
        { label: 'Add to timeline', onClick: () => s.addAssetClip(assetMenu.a.id) },
        { label: '', sep: true, onClick: () => {} },
        { label: 'Delete asset', danger: true, onClick: () => s.deleteAsset(assetMenu.a.id) },
      ]} />}
    </div>
  )
}
