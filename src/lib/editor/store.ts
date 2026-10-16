import { create } from 'zustand'

export type ClipType = 'video' | 'audio' | 'adjustment'
export type Tool = 'select' | 'razor' | 'ripple' | 'roll' | 'slip'
export interface Asset { id: string; name: string; kind: 'video' | 'audio' | 'image'; url: string; duration: number; thumb?: string }
export interface Clip { id: string; trackId: string; name: string; start: number; duration: number; type: ClipType; hue: number; assetId?: string; trimStart?: number; speed?: number; volume?: number }
export interface Track { id: string; name: string; kind: 'video' | 'audio'; locked: boolean; muted: boolean }
interface Snap { tracks: Track[]; clips: Clip[] }
interface TL extends Snap { id: string; name: string }
interface Menu { x: number; y: number; clipId: string }

const uid = () => Math.random().toString(36).slice(2, 9)
const seed: Snap = {
  tracks: [
    { id: 'V3', name: 'V3', kind: 'video', locked: false, muted: false },
    { id: 'V2', name: 'V2', kind: 'video', locked: false, muted: false },
    { id: 'V1', name: 'V1', kind: 'video', locked: false, muted: false },
    { id: 'A1', name: 'A1', kind: 'audio', locked: false, muted: false },
    { id: 'A2', name: 'A2', kind: 'audio', locked: false, muted: false },
  ],
  clips: [],
}

interface State extends Snap {
  inPoint: number | null; outPoint: number | null
  setIn: () => void; setOut: () => void; clearMarks: () => void
  assets: Asset[]; sourceId: string | null; timelines: TL[]; activeId: string; openIds: string[]; menu: Menu | null
  addAssets: (a: Asset[]) => void; deleteAsset: (id: string) => void; setSource: (id: string | null) => void
  addAssetClip: (assetId: string, trackId?: string, start?: number) => void
  newTimeline: () => void; switchTimeline: (id: string) => void; closeTab: (id: string) => void; renameTimeline: (id: string, name: string) => void
  openMenu: (m: Menu) => void; closeMenu: () => void
  playhead: number; playing: boolean; zoom: number; snap: boolean; tool: Tool
  selected: string[]; past: Snap[]; future: Snap[]
  setPlayhead: (t: number) => void; setPlaying: (p: boolean) => void
  setZoom: (z: number) => void; toggleSnap: () => void; setTool: (t: Tool) => void
  select: (id: string | null, additive?: boolean) => void
  checkpoint: () => void
  patchClip: (id: string, p: Partial<Clip>) => void
  addClip: (c: Omit<Clip, 'id'>) => void
  splitAt: (id: string, t: number) => void
  deleteSelected: () => void
  toggleTrack: (id: string, key: 'locked' | 'muted') => void
  addTrack: (kind: 'video' | 'audio') => void
  undo: () => void; redo: () => void
}

const mkTracks = (): Track[] => (['V3', 'V2', 'V1', 'A1', 'A2'] as const).map(n => ({ id: uid(), name: n, kind: n[0] === 'V' ? 'video' : 'audio', locked: false, muted: false }))
const stash = (s: Snap & { timelines: TL[]; activeId: string }) => s.timelines.map(t => (t.id === s.activeId ? { ...t, tracks: s.tracks, clips: s.clips } : t))

export const useEditor = create<State>((set, get) => ({
  ...seed, inPoint: null, outPoint: null, assets: [], sourceId: null, timelines: [{ id: 't1', name: 'Timeline 1', ...seed }], activeId: 't1', openIds: ['t1'], menu: null, playhead: 0, playing: false, zoom: 1, snap: true, tool: 'select', selected: [], past: [], future: [],
  setPlayhead: t => set({ playhead: Math.max(0, t) }),
  setPlaying: playing => set({ playing }),
  setZoom: z => set({ zoom: Math.min(4, Math.max(0.25, z)) }),
  toggleSnap: () => set(s => ({ snap: !s.snap })),
  setTool: tool => set({ tool }),
  select: (id, add) => set(s => ({ selected: id === null ? [] : add ? (s.selected.includes(id) ? s.selected.filter(x => x !== id) : [...s.selected, id]) : [id] })),
  checkpoint: () => set(s => ({ past: [...s.past.slice(-49), { tracks: s.tracks, clips: s.clips }], future: [] })),
  patchClip: (id, p) => set(s => ({ clips: s.clips.map(c => (c.id === id ? { ...c, ...p } : c)) })),
  addClip: c => { get().checkpoint(); set(s => ({ clips: [...s.clips, { ...c, id: uid() }] })) },
  splitAt: (id, t) => {
    const c = get().clips.find(x => x.id === id)
    if (!c || t <= c.start + 0.1 || t >= c.start + c.duration - 0.1) return
    get().checkpoint()
    const left = { ...c, duration: t - c.start }
    const right = { ...c, id: uid(), start: t, duration: c.start + c.duration - t }
    set(s => ({ clips: s.clips.flatMap(x => (x.id === id ? [left, right] : [x])) }))
  },
  deleteSelected: () => { if (!get().selected.length) return; get().checkpoint(); set(s => ({ clips: s.clips.filter(c => !s.selected.includes(c.id)), selected: [] })) },
  toggleTrack: (id, key) => set(s => ({ tracks: s.tracks.map(t => (t.id === id ? { ...t, [key]: !t[key] } : t)) })),
  addTrack: kind => { get().checkpoint(); set(s => { const n = s.tracks.filter(t => t.kind === kind).length + 1
    const t: Track = { id: uid(), name: `${kind === 'video' ? 'V' : 'A'}${n}`, kind, locked: false, muted: false }
    return { tracks: kind === 'video' ? [t, ...s.tracks] : [...s.tracks, t] } }) },

  addAssets: a => set(s => ({ assets: [...s.assets, ...a], sourceId: s.sourceId ?? a[0]?.id ?? null })),
  deleteAsset: id => { get().checkpoint(); set(s => ({ assets: s.assets.filter(a => a.id !== id), clips: s.clips.filter(c => c.assetId !== id), sourceId: s.sourceId === id ? null : s.sourceId })) },
  setIn: () => set(s => ({ inPoint: s.playhead, outPoint: s.outPoint !== null && s.outPoint <= s.playhead ? null : s.outPoint })),
  setOut: () => set(s => ({ outPoint: s.playhead, inPoint: s.inPoint !== null && s.inPoint >= s.playhead ? null : s.inPoint })),
  clearMarks: () => set({ inPoint: null, outPoint: null }),
  setSource: id => set({ sourceId: id }),
  addAssetClip: (assetId, trackId, start) => {
    const s = get(), a = s.assets.find(x => x.id === assetId); if (!a) return
    const kind = a.kind === 'audio' ? 'audio' : 'video'
    const ok = s.tracks.filter(t => t.kind === kind && !t.locked)
    const tr = ok.find(t => t.id === trackId) ?? ok.at(-1); if (!tr) return
    const at = start ?? s.clips.filter(c => c.trackId === tr.id).reduce((m, c) => Math.max(m, c.start + c.duration), 0)
    get().addClip({ trackId: tr.id, name: a.name, start: at, duration: a.duration, type: kind, hue: [...a.name].reduce((h, c) => h + c.charCodeAt(0), 0) % 360, assetId: a.id, trimStart: 0, speed: 1, volume: 1 })
  },
  newTimeline: () => set(s => { const id = uid(), tracks = mkTracks()
    return { timelines: [...stash(s), { id, name: `Timeline ${s.timelines.length + 1}`, tracks, clips: [] }], activeId: id, openIds: [...s.openIds, id], tracks, clips: [], selected: [], past: [], future: [], playhead: 0, playing: false } }),
  switchTimeline: id => set(s => { const t = s.timelines.find(x => x.id === id); if (!t || id === s.activeId) return s
    return { timelines: stash(s), activeId: id, openIds: s.openIds.includes(id) ? s.openIds : [...s.openIds, id], tracks: t.tracks, clips: t.clips, selected: [], past: [], future: [], playhead: 0, playing: false } }),
  closeTab: id => { const s = get(); if (s.openIds.length < 2) return
    const rest = s.openIds.filter(x => x !== id)
    if (id === s.activeId) get().switchTimeline(rest[0])
    set({ openIds: rest }) },
  renameTimeline: (id, name) => set(s => ({ timelines: s.timelines.map(t => (t.id === id ? { ...t, name } : t)) })),
  openMenu: menu => set({ menu }), closeMenu: () => set({ menu: null }),
  undo: () => set(s => { const p = s.past.at(-1); return p ? { ...p, past: s.past.slice(0, -1), future: [{ tracks: s.tracks, clips: s.clips }, ...s.future] } : s }),
  redo: () => set(s => { const n = s.future[0]; return n ? { ...n, future: s.future.slice(1), past: [...s.past, { tracks: s.tracks, clips: s.clips }] } : s }),
}))

export const totalDuration = (clips: Clip[]) => clips.reduce((m, c) => Math.max(m, c.start + c.duration), 0)
export const timecode = (t: number, fps = 24) => {
  const f = Math.floor((t % 1) * fps), s = Math.floor(t)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}:${p(f)}`
}
