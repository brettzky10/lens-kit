'use client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useEditor } from '@/lib/editor/store'

function Field({ label, value, step = 0.1, min = 0, max, onChange }: { label: string; value: number; step?: number; min?: number; max?: number; onChange: (v: number) => void }) {
  const checkpoint = useEditor(s => s.checkpoint)
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-[11px] font-normal text-zinc-400">{label}</Label>
      <Input type="number" value={+value.toFixed(2)} step={step} min={min} max={max} onFocus={checkpoint}
        onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(Math.min(max ?? Infinity, Math.max(min, v))) }}
        className="h-7 w-20 px-2 text-right text-xs" />
    </div>
  )
}

export function PropertiesPanel() {
  const s = useEditor()
  const c = s.selected.length === 1 ? s.clips.find(x => x.id === s.selected[0]) : undefined
  const a = c && s.assets.find(x => x.id === c.assetId)
  return (
    <aside className="w-60 border-l border-zinc-800 bg-zinc-900 p-3 flex flex-col gap-3 overflow-auto">
      <div className="font-semibold">Properties</div>
      {!c ? <p className="text-xs text-zinc-500">Select a clip on the timeline to edit its timing, speed and volume.</p> : (
        <>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-normal text-zinc-400">Name</Label>
            <Input value={c.name} onFocus={s.checkpoint} onChange={e => s.patchClip(c.id, { name: e.target.value })} className="h-7 text-xs" />
          </div>
          {a && <div className="text-[10px] text-zinc-500 truncate">Source: {a.name} ({a.duration.toFixed(1)}s)</div>}
          <Field label="Start (s)" value={c.start} onChange={v => s.patchClip(c.id, { start: v })} />
          <Field label="Duration (s)" value={c.duration} min={0.25} onChange={v => s.patchClip(c.id, { duration: v })} />
          <Field label="Source in (s)" value={c.trimStart ?? 0} onChange={v => s.patchClip(c.id, { trimStart: v })} />
          <Field label="Speed" value={c.speed ?? 1} step={0.25} min={0.25} max={4} onChange={v => s.patchClip(c.id, { speed: v })} />
          <Field label="Volume" value={c.volume ?? 1} step={0.1} max={1} onChange={v => s.patchClip(c.id, { volume: v })} />
        </>
      )}
    </aside>
  )
}
